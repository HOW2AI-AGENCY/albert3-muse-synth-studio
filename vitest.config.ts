import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@sentry/react': path.resolve(__dirname, 'src/test/mocks/sentry-react.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      'node_modules/',
      'supabase/functions/**', // Exclude Deno tests from Vitest execution
      'tests/e2e/**', // Exclude Playwright E2E tests
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/dist',
        'supabase/functions/**', // Also exclude from coverage
      ],
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 55,
        branches: 40,
      },
    },
  },
});
