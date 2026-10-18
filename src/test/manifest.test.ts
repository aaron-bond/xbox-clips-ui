import { describe, expect, it } from 'vitest';
import html from '../../index.html?raw';
import manifestText from '../../public/manifest.webmanifest?raw';

// The installable app (PLAN-v1.md §11, P5): what Chromium needs to offer install.
const manifest = JSON.parse(manifestText) as {
  name: string;
  start_url: string;
  display: string;
  icons: { src: string; sizes: string; purpose?: string }[];
};
const iconFiles = Object.keys(import.meta.glob('../../public/icons/*', { query: '?url' })).map((p) => p.replace('../../public', ''));

describe('web app manifest', () => {
  it('has what installing needs: a name, start URL, standalone display, 192 and 512 icons', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.filter((i) => (i.purpose ?? 'any') === 'any').map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('points only at icons that exist, and is linked from the page with the Apple icon', () => {
    for (const icon of manifest.icons) expect(iconFiles).toContain(icon.src);
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    const linked = [...html.matchAll(/href="(\/icons\/[^"]+)"/g)].map((m) => m[1]);
    expect(linked).toContain('/icons/apple-touch-icon.png');
    for (const href of linked) expect(iconFiles).toContain(href);
  });
});
