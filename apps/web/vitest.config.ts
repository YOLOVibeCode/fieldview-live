import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig(async () => {
  // `@vitejs/plugin-react` is ESM-only; load via dynamic import to avoid CJS require issues.
  const { default: react } = await import('@vitejs/plugin-react');

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./__tests__/setup.ts'],
      // IMPORTANT: Setting `exclude` overrides Vitest defaults. Include node_modules and build output.
      // Also exclude Playwright E2E specs (e2e/, tests/e2e/, __tests__/e2e/ — run via `pnpm --filter web test:live`).
      exclude: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/e2e/**',
      ],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  };
});
