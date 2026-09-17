import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file for tests
dotenvConfig({ path: resolve(__dirname, '.env') });

export default defineConfig({
  test: {
    // IMPORTANT: Setting `exclude` overrides Vitest defaults. Include node_modules, build output, etc.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '__tests__/live/**',
      // Require Postgres — run via vitest.live.config.ts / test:live, not unit CI
      'src/repositories/__tests__/ClipRepository.test.ts',
      'src/repositories/__tests__/BookmarkRepository.test.ts',
      'src/jobs/__tests__/cleanup.test.ts',
      'src/services/__tests__/DVRService.test.ts',
      '__tests__/services/AbuseDetectionService.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', '__tests__'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
