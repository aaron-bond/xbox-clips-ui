import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderAt, stubRoutes } from '../test/helpers';
import { CHECK_INTERVAL, startBuildWatch, type BuildWatch } from './build';

let watch: BuildWatch | null = null;
afterEach(() => {
  watch?.stop();
  watch = null;
});

describe('the root route and the build watch', () => {
  it("doesn't hold up a navigation while a check of version.json is still pending", async () => {
    stubRoutes({ '/api/v1/games/most-played': { body: { games: [] } } });
    let now = 0;
    const versionFetch = vi.fn(() => new Promise<Response>(() => {}));
    watch = startBuildWatch({ build: 'aaa', fetchImpl: versionFetch as unknown as typeof fetch, now: () => now });
    const { router } = renderAt('/');
    now += CHECK_INTERVAL;
    window.dispatchEvent(new Event('focus'));
    expect(versionFetch).toHaveBeenCalledTimes(1);
    await act(() => router.navigate('/no-such-page'));
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/no-such-page');
  });

  it('renders the first page without running the root loader', async () => {
    stubRoutes({ '/api/v1/games/most-played': { body: { games: [] } } });
    const { router } = renderAt('/no-such-page');
    // Synchronously: no loading pass before the first render.
    expect(router.state.initialized).toBe(true);
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
});
