import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Not VITE_-prefixed, so it stays out of the client bundle.
  const { API_PROXY_TARGET = 'https://xboxclips.io' } = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    // Local development calls /api/... on its own origin, as production does. The
    // browser's own Sec-Fetch-Site passes through, so the site's same-origin check
    // treats these requests like any visitor's (the API's PLAN-v1.md §6).
    server: { proxy: { '/api': { target: API_PROXY_TARGET, changeOrigin: true } } },
  };
});
