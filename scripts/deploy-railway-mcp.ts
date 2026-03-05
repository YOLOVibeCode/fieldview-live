#!/usr/bin/env pnpm tsx
/**
 * Railway Deploy via MCP – Prep workflow.
 * Runs preflight, version bump, and commit. Deployment is triggered via Railway MCP (Cursor).
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const isSig = process.env.DEPLOY_SIGNIFICANT === '1' || process.argv.includes('--significant');
const bumpType = process.argv.includes('--minor')
  ? 'minor'
  : process.argv.includes('--major')
    ? 'major'
    : isSig
      ? 'minor'
      : 'build';

function run(cmd: string, env?: NodeJS.ProcessEnv, inheritStdio = false): string {
  const out = execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: inheritStdio ? 'inherit' : ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  }) as string | undefined;
  return (typeof out === 'string' ? out.trim() : '') || '';
}

function getVersion(): string {
  const pkg = JSON.parse(
    readFileSync(path.join(ROOT, 'apps/api/package.json'), 'utf-8')
  );
  return pkg.version as string;
}

function main(): void {
  console.log('\n🚀 Railway Deploy (MCP) – Prep\n');

  const currentVersion = getVersion();
  console.log(`📦 Current version: ${currentVersion}\n`);

  console.log('🔨 Running preflight build...\n');
  run(`bash "${path.join(ROOT, 'scripts/preflight-build.sh')}"`, undefined, true);
  console.log('');

  console.log('📦 Bumping version...');
  const bumpOut = run(`bash "${path.join(ROOT, 'scripts/version-manager.sh')}" ${bumpType}`);
  const newVersion = bumpOut.split('\n').filter(Boolean).pop() ?? getVersion();
  console.log(`✅ Version: ${newVersion}\n`);

  console.log('📝 Committing version...');
  run('git add apps/api/package.json apps/web/package.json package.json');
  try {
    run(`git commit -m "chore: bump version to ${newVersion}"`);
  } catch {
    // nothing to commit
  }
  if (bumpType === 'minor' || bumpType === 'major') {
    try {
      run(`git tag -a "v${newVersion}" -m "Release v${newVersion}"`);
    } catch {
      // tag exists
    }
  }
  console.log('✅ Committed\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Prep complete. Deploy via Railway MCP in Cursor:');
  console.log('  1) Deploy service "api"');
  console.log('  2) Deploy service "web"');
  console.log('  3) Verify with list-deployments');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Version: ${newVersion}`);
  console.log('  Verify: https://fieldview.live');
  console.log('');
}

main();
