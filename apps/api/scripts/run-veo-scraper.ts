/**
 * Standalone entry point for the Veo stream scraper.
 * Loads .env, runs the scraper, logs result.
 *
 * Usage: from repo root:
 *   pnpm --filter api veo-scraper
 * Or from apps/api:
 *   dotenv -e .env -- tsx scripts/run-veo-scraper.ts
 */

import { runVeoScraperFromEnv } from '../src/modules/veo-scraper';

async function main(): Promise<void> {
  console.log('Veo scraper starting (config from env)...\n');
  try {
    const result = await runVeoScraperFromEnv();
    console.log('Veo scraper finished.');
    console.log(`  Scraped: ${result.scraped} rows`);
    console.log(`  Matched: ${result.matched}`);
    console.log(`  Updated: ${result.updated}`);
    console.log(`  Skipped (unchanged): ${result.skipped}`);
    if (result.details.length > 0) {
      console.log('\nDetails:');
      result.details.forEach((d) => {
        console.log(`  - ${d.eventSlug}: ${d.oldUrl ?? 'null'} -> ${d.newUrl} (confidence: ${d.confidence})`);
      });
    }
  } catch (err) {
    console.error('Veo scraper failed:', err);
    process.exit(1);
  }
}

main();
