#!/usr/bin/env node
/**
 * Sync the .traklet/test-cases markdown files to GitHub issues so they render
 * in the Traklet widget on dev.fieldview.live. Idempotent: writes `backend-id`
 * back into each file's frontmatter and skips already-synced cases on re-run.
 *
 * Usage:
 *   node scripts/traklet-sync-github.mjs                  # create missing issues
 *   node scripts/traklet-sync-github.mjs --dry-run        # preview only
 *   node scripts/traklet-sync-github.mjs --push-updates   # also push title/body edits to existing issues
 *   node scripts/traklet-sync-github.mjs --force          # re-create even if synced
 *
 * Token resolution order:
 *   1. $NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN (tokenEnv from .traklet/config.md)
 *   2. $GITHUB_TOKEN
 *   3. `gh auth token`
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_CASES_DIR = path.join(ROOT, '.traklet', 'test-cases');
const CONFIG_PATH = path.join(ROOT, '.traklet', 'config.md');
const TRAKLET_BUNDLE = path.join(
  ROOT,
  'apps/web/node_modules/traklet/dist/traklet.es.js'
);

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const PUSH_UPDATES = process.argv.includes('--push-updates');
const CREATE_DELAY_MS = 750; // stay under GitHub's secondary rate limit for content creation

// ---------- config + token ----------

function readConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const fm = parseFrontmatter(raw);
  if (!fm.meta.project) {
    throw new Error(`No 'project' in ${CONFIG_PATH}`);
  }
  return { project: fm.meta.project, tokenEnv: fm.meta.tokenEnv };
}

function resolveToken(tokenEnv) {
  if (tokenEnv && process.env[tokenEnv]) return process.env[tokenEnv];
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const t = execSync('gh auth token', { encoding: 'utf-8' }).trim();
    if (t) return t;
  } catch {
    /* gh not available */
  }
  throw new Error(
    `No GitHub token found. Set ${tokenEnv ?? 'GITHUB_TOKEN'} or run 'gh auth login'.`
  );
}

// ---------- minimal frontmatter parsing (id/title/priority/labels/suite/backend-id) ----------

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw, fmBlock: null };
  const meta = {};
  let currentListKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentListKey) {
      meta[currentListKey].push(unquote(listItem[1].trim()));
      continue;
    }
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '') {
      meta[key] = [];
      currentListKey = key;
    } else {
      meta[key] = unquote(value.trim());
      currentListKey = null;
    }
  }
  return { meta, body: raw.slice(m[0].length), fmBlock: m[0] };
}

function unquote(s) {
  return s.replace(/^["']|["']$/g, '');
}

/** Insert or replace backend-id / last-synced inside the frontmatter block. */
function writeBackendId(filePath, raw, backendId) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`No frontmatter in ${filePath}`);
  let fmBody = m[1]
    .split(/\r?\n/)
    .filter((l) => !/^(backend-id|last-synced):/.test(l))
    .join('\n');
  fmBody += `\nbackend-id: "${backendId}"\nlast-synced: "${new Date().toISOString()}"`;
  const updated = raw.replace(m[0], `---\n${fmBody}\n---`);
  fs.writeFileSync(filePath, updated, 'utf-8');
}

// ---------- scan ----------

function scanTestCaseFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...scanTestCaseFiles(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out.sort();
}

// ---------- main ----------

async function main() {
  const { project, tokenEnv } = readConfig();
  const token = resolveToken(tokenEnv);

  const { GitHubAdapter } = await import(TRAKLET_BUNDLE);
  const adapter = new GitHubAdapter();
  const projectId = project.split('/')[1]; // e.g. fieldview-live
  const conn = await adapter.connect({
    type: 'github',
    token,
    projects: [{ id: projectId, name: projectId, identifier: project }],
  });
  if (!conn.success) throw new Error(`GitHub connect failed: ${conn.error}`);

  const files = scanTestCaseFiles(TEST_CASES_DIR);
  console.log(`Found ${files.length} test case file(s) in .traklet/test-cases/`);
  if (DRY_RUN) console.log('(dry run — no issues will be created)\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    const rel = path.relative(ROOT, filePath);

    if (!meta.id || !meta.title) {
      console.log(`  ! ${rel}: missing id/title, skipping`);
      failed++;
      continue;
    }

    if (meta['backend-id'] && !FORCE) {
      let exists = true;
      try {
        exists = await adapter.issueExists(projectId, meta['backend-id']);
      } catch {
        /* can't verify — treat as synced */
      }
      if (exists) {
        if (PUSH_UPDATES) {
          // Push title/body from the file onto the existing issue. Labels are
          // intentionally left alone so pipeline state labels survive.
          const title = `${meta.id}: ${meta.title}`;
          if (DRY_RUN) {
            console.log(`  ~ would update: #${meta['backend-id']} ${title}`);
            updated++;
            continue;
          }
          try {
            await adapter.updateIssue(projectId, meta['backend-id'], {
              title,
              body: body.trim(),
            });
            console.log(`  ~ #${meta['backend-id']} ${title}`);
            updated++;
            await new Promise((r) => setTimeout(r, CREATE_DELAY_MS));
          } catch (err) {
            console.error(
              `  x ${meta.id}: ${err instanceof Error ? err.message : err}`
            );
            failed++;
          }
        } else {
          skipped++;
        }
        continue;
      }
    }

    // Same label semantics as traklet's syncToBackend, plus the priority-
    // label the GitHub adapter reads priority from.
    const labels = new Set(Array.isArray(meta.labels) ? meta.labels : []);
    labels.add('test-case');
    if (meta.suite) labels.add(`suite:${meta.suite}`);
    if (meta.priority) labels.add(`priority-${meta.priority}`);

    const title = `${meta.id}: ${meta.title}`;

    if (DRY_RUN) {
      console.log(`  + would create: ${title} [${[...labels].join(', ')}]`);
      created++;
      continue;
    }

    try {
      const issue = await adapter.createIssue(projectId, {
        title,
        body: body.trim(),
        labels: [...labels],
      });
      writeBackendId(filePath, raw, issue.id);
      console.log(`  + #${issue.id} ${title}`);
      created++;
      await new Promise((r) => setTimeout(r, CREATE_DELAY_MS));
    } catch (err) {
      console.error(`  x ${meta.id}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(
    `\nSync complete: created=${created} updated=${updated} skipped=${skipped} failed=${failed}`
  );
  if (created > 0 && !DRY_RUN) {
    console.log('Backend IDs written to frontmatter — commit the .traklet changes.');
  }
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
