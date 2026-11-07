import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { buildIdPlugin } from './build/build-id';

export default defineConfig(({ mode }) => {
  // Not VITE_-prefixed, so it stays out of the client bundle.
  const { API_PROXY_TARGET = 'https://xboxclips.io' } = loadEnv(mode, '.', '');
  return {
    // buildIdPlugin: version.json and the page's build ID, for open tabs (PLAN-v1.md §15).
    plugins: [react(), buildIdPlugin()],
    // Local development calls /api/... on its own origin, as production does. The
    // browser's own Sec-Fetch-Site passes through, so the site's same-origin check
    // treats these requests like any visitor's (the API's PLAN-v1.md §6).
    server: { proxy: { '/api': { target: API_PROXY_TARGET, changeOrigin: true } } },
  };
});
