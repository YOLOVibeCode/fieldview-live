import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env file for live tests
config();

export default defineConfig({
  test: {
    include: ['__tests__/live/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});


