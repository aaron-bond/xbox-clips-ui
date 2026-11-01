import { describe, expect, it } from 'vitest';
import { storeImage, storeImageSet } from './games';

describe('storeImage', () => {
  it('asks a store image for a width', () => {
    expect(storeImage('https://store-images.s-microsoft.com/image/apps.1', 300)).toBe('https://store-images.s-microsoft.com/image/apps.1?w=300');
    expect(storeImage(null, 300)).toBeUndefined();
  });

  it('adds to a URL that already has a query: a second ? is a 500', () => {
    const url = 'https://images-eds-ssl.xboxlive.com/image?url=abc';
    expect(storeImage(url, 300)).toBe(`${url}&w=300`);
    expect(storeImageSet(url, [300, 600])).toBe(`${url}&w=300 300w, ${url}&w=600 600w`);
  });
});
