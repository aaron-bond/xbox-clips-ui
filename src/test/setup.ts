import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// jsdom has no media playback. Each test starts with play() succeeding; tests that
// need it to be refused override it.
afterEach(() => {
  cleanup();
  // Globals a test swaps in (fetch, an off-screen IntersectionObserver) never leak into the next.
  vi.unstubAllGlobals();
  // Pinned and recent players live in local storage; every test starts without any.
  localStorage.clear();
});

// jsdom has no IntersectionObserver: report every observed element as on screen,
// so content that loads on scroll loads in tests.
class OnScreenObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    queueMicrotask(() => this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver = OnScreenObserver as unknown as typeof IntersectionObserver;
beforeEach(() => {
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});
