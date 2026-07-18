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
