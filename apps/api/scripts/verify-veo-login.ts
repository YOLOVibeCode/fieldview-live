/**
 * Prove the browser-free Veo login against live Veo: email + password → session
 * cookie → access token → the club's live streams. Read-only; no database.
 * Prints only statuses, lengths and counts — never a credential.
 *
 *   VEO_EMAIL=… VEO_PASSWORD='…' [VEO_CLUB_URL=…] npx tsx scripts/verify-veo-login.ts
 *
 * Instead of VEO_PASSWORD, VEO_NOTE may hold free text with a "password: …" line
 * (and optionally an email), e.g. a vault note injected by `opx run`.
 * Makes exactly one login attempt.
 */
import { createVeoProvider } from '../src/modules/camera-sources/providers/veo';
import { HttpVeoSessionSeeder } from '../src/modules/camera-sources/providers/veo/HttpVeoSessionSeeder';
import type { FetchLike } from '../src/modules/camera-sources/interfaces';

const DEFAULT_CLUB_URL = 'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics';

/**
 * Pull the login out of a free-text note. A labelled line may be a Markdown list item and
 * the label may be bold: "password: x", "- password: x", "- **Password:** x", "- **Password**: x".
 */
function labelled(note: string, label: string): string | undefined {
  const line = new RegExp(
    `^[ \\t]*(?:[-*+][ \\t]+)?[*_\`]*[ \\t]*${label}[ \\t]*[*_\`]*[ \\t]*[:=][*_\`]*[ \\t]+(.+?)[ \\t]*$`,
    'im'
  );
  return note.match(line)?.[1]?.replace(/^`(.*)`$/, '$1');
}

export function fromNote(note: string): { email?: string; password?: string; labels: string[] } {
  const labels = note
    .split(/\r?\n/)
    .map((l) => l.match(/^[ \t]*(?:[-*+][ \t]+)?[*_`]*[ \t]*([A-Za-z][A-Za-z _-]{0,30}?)[ \t]*[*_`]*[ \t]*[:=]/)?.[1])
    .filter((label): label is string => !!label)
    .map((label) => label.trim().toLowerCase());
  const password = labelled(note, '(?:veo[ \\t]*)?pass(?:word)?');
  const email =
    labelled(note, '(?:e-?mail|username|login)')?.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] ??
    note.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0];
  return { email, password, labels };
}

async function main(): Promise<void> {
  const note = process.env.VEO_NOTE ?? '';
  const parsed = fromNote(note);
  const email = (process.env.VEO_EMAIL || parsed.email || '').trim();
  const password = process.env.VEO_PASSWORD || parsed.password || '';

  if (note) {
    console.log(`note: ${note.length} chars, ${note.split(/\r?\n/).length} lines, labels: [${parsed.labels.join(', ')}]`);
  }
  console.log(`email found: ${!!email} | password found: ${!!password} (length ${password.length})`);
  if (!email || !password) {
    throw new Error('Need an email and a password (VEO_EMAIL / VEO_PASSWORD, or a VEO_NOTE with a "password:" line)');
  }

  const fetch = globalThis.fetch as unknown as FetchLike;
  console.log('1. logging in over plain HTTP (one attempt)…');
  const sessionCookie = await new HttpVeoSessionSeeder({ fetch }).seed({ email, password });
  const names = sessionCookie.split('; ').map((pair) => pair.split('=')[0]);
  console.log(`   session cookie issued: ${names.join(', ')} (${sessionCookie.length} chars)`);

  const veo = createVeoProvider();
  const clubUrl = process.env.VEO_CLUB_URL || DEFAULT_CLUB_URL;
  console.log('2. verifying the session by minting an access token…');
  const result = await veo.connector.connect({ email, clubUrl, sessionCookie });
  console.log(`   verified; would store config keys [${Object.keys(result.config).join(', ')}] and secrets [${Object.keys(result.secrets).join(', ')}]`);

  console.log('3. listing live streams with that session…');
  const streams = await veo.lister.listLive({
    id: 'verify',
    ownerAccountId: 'verify',
    provider: veo.id,
    config: result.config,
    secrets: result.secrets,
  });
  console.log(`   live streams right now: ${streams.length}`);
  console.log('\n✅ Browser-free Veo login works end to end.');
}

if (require.main === module) {
  main().catch((e: unknown) => {
    const err = e as { name?: string; message?: string };
    console.error('ERR', err?.name, err?.message);
    process.exit(1);
  });
}
