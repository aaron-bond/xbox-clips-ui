import type { Plugin } from 'vite';

/**
 * The build ID (PLAN-v1.md §15): a hash of the hashed asset names that
 * index.html loads. Vite names each asset by its content, so the ID changes
 * exactly when the browser code or styles do, and a push that changes only docs
 * or Pages Functions leaves it alone.
 */

export const VERSION_FILE = 'version.json';
export const META_NAME = 'app-build';

/** The built assets a page loads, in a stable order. */
export function assetRefs(html: string): string[] {
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]!).sort();
}

export async function buildIdOf(html: string): Promise<string> {
  const refs = assetRefs(html);
  if (refs.length === 0) throw new Error('build-id: index.html loads no built assets');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(refs.join('\n')));
  return [...new Uint8Array(digest).slice(0, 6)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stamps the ID into index.html as `<meta name="app-build">` and writes it to
 * `version.json`, which open tabs fetch to learn of a new build. Build only: the
 * dev server has neither, so the check stays off there.
 */
export function buildIdPlugin(): Plugin {
  return {
    name: 'build-id',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      const page = bundle['index.html'];
      if (!page || page.type !== 'asset') return this.error('build-id: index.html is not in the bundle');
      const html = String(page.source);
      const id = await buildIdOf(html);
      page.source = html.replace('</head>', `  <meta name="${META_NAME}" content="${id}" />\n  </head>`);
      this.emitFile({ type: 'asset', fileName: VERSION_FILE, source: `${JSON.stringify({ build: id })}\n` });
    },
  };
}
