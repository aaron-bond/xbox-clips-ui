import { cloudflareTest } from '@cloudflare/vitest-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // The React app, in a simulated browser.
        plugins: [react()],
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        // The Pages Function, in the Workers runtime, which provides HTMLRewriter.
        plugins: [cloudflareTest({ miniflare: { compatibilityDate: '2026-10-01' } })],
        test: {
          name: 'functions',
          include: ['functions/**/*.test.ts'],
        },
      },
    ],
  },
});
