import { build, type Rollup } from 'vite';
import { describe, expect, it } from 'vitest';
import { assetRefs, buildIdOf, META_NAME, VERSION_FILE } from './build-id';

/** A production build, kept in memory. */
async function buildApp(): Promise<Map<string, string>> {
  const out = (await build({ configFile: 'vite.config.ts', logLevel: 'silent', build: { write: false } })) as Rollup.RollupOutput;
  return new Map(out.output.map((f) => [f.fileName, f.type === 'asset' ? String(f.source) : f.code]));
}

const metaOf = (html: string) => new RegExp(`<meta name="${META_NAME}" content="([0-9a-f]+)"`).exec(html)?.[1];

// In place of a reload-loop guard in the app (PLAN-v1.md §15): if version.json and
// the page ever disagreed, every navigation would become a full page load.
describe('the build ID in the built app', () => {
  it('is the same in version.json and the page, is derived from the assets it loads, and is stable', async () => {
    const first = await buildApp();
    const html = first.get('index.html')!;
    const id = metaOf(html);
    expect(id).toMatch(/^[0-9a-f]{12}$/);
    expect(JSON.parse(first.get(VERSION_FILE)!)).toEqual({ build: id });
    expect(await buildIdOf(html)).toBe(id);
    expect(assetRefs(html).some((r) => r.endsWith('.js'))).toBe(true);
    expect(assetRefs(html).some((r) => r.endsWith('.css'))).toBe(true);

    const second = await buildApp();
    expect(metaOf(second.get('index.html')!)).toBe(id);
  }, 60_000);
});

describe('buildIdOf', () => {
  it('changes when any loaded asset does, ignoring order and anything outside /assets/', async () => {
    const page = (js: string, css: string, extra = '') =>
      `<script type="module" src="/assets/${js}"></script><link rel="stylesheet" href="/assets/${css}">${extra}`;
    const id = await buildIdOf(page('index-A.js', 'index-B.css'));
    expect(await buildIdOf(page('index-A.js', 'index-C.css'))).not.toBe(id);
    expect(await buildIdOf(page('index-Z.js', 'index-B.css'))).not.toBe(id);
    expect(await buildIdOf(`<link rel="stylesheet" href="/assets/index-B.css"><script src="/assets/index-A.js"></script>`)).toBe(id);
    expect(await buildIdOf(page('index-A.js', 'index-B.css', '<link rel="icon" href="/icons/favicon-32.png">'))).toBe(id);
  });

  it('refuses a page that loads no built assets', async () => {
    await expect(buildIdOf('<html></html>')).rejects.toThrow('no built assets');
  });
});
