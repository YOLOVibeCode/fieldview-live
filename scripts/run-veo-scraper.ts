/**
 * Run the Veo stream scraper (delegates to api package).
 * Usage from repo root: pnpm --filter api veo-scraper
 * Or: pnpm exec tsx scripts/run-veo-scraper.ts (requires .env in apps/api)
 *
 * Required env: VEO_EMAIL, VEO_PASSWORD, VEO_DIAGNOSTICS_URL, VEO_OWNER_ACCOUNT_ID, DATABASE_URL
 */

import { spawn } from 'child_process';
import { join } from 'path';

const apiDir = join(__dirname, '..', 'apps', 'api');
const child = spawn(
  'pnpm',
  ['exec', 'dotenv', '-e', '.env', '--', 'tsx', 'scripts/run-veo-scraper.ts'],
  {
    cwd: apiDir,
    stdio: 'inherit',
    shell: true,
  }
);
child.on('exit', (code) => process.exit(code ?? 0));
