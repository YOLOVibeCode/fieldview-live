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
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  };
});
