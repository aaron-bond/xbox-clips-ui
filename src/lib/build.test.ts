import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHECK_INTERVAL, currentBuild, staleBuildLoader, startBuildWatch, type BuildWatch } from './build';

const HOUR = CHECK_INTERVAL;
let watch: BuildWatch | null = null;

afterEach(() => {
  watch?.stop();
  watch = null;
  document.head.querySelectorAll('meta[name="app-build"]').forEach((m) => m.remove());
});

/** A watch on build `aaa` with a controllable clock and `version.json` answer. */
function setup(answer: () => Promise<Response> = async () => Response.json({ build: 'bbb' })) {
  let now = 0;
  const fetchImpl = vi.fn(answer);
  const reload = vi.fn();
  watch = startBuildWatch({ build: 'aaa', fetchImpl: fetchImpl as unknown as typeof fetch, now: () => now });
  watch.reload = reload;
  return {
    fetchImpl,
    reload,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const focus = () => window.dispatchEvent(new Event('focus'));
const args = (url: string) => ({ request: new Request(url), params: {}, context: undefined }) as unknown as Parameters<typeof staleBuildLoader>[0];

describe('currentBuild', () => {
  it('reads the ID the build stamps into the page, and is null without it', () => {
    expect(currentBuild()).toBeNull();
    const meta = Object.assign(document.createElement('meta'), { name: 'app-build', content: '5824a52a1b4b' });
    document.head.append(meta);
    expect(currentBuild()).toBe('5824a52a1b4b');
  });
});

describe('startBuildWatch', () => {
  it("doesn't check a tab that has only just loaded", async () => {
    const { fetchImpl } = setup();
    focus();
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('checks on focus after an hour, at most once an hour, with no caching', async () => {
    const { fetchImpl, advance } = setup(async () => Response.json({ build: 'aaa' }));
    advance(HOUR);
    focus();
    focus();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('/version.json', { cache: 'no-store' });
    advance(HOUR - 1);
    window.dispatchEvent(new Event('pageshow'));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    advance(1);
    window.dispatchEvent(new Event('pageshow'));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('checks when the tab becomes visible again', async () => {
    const { fetchImpl, advance } = setup();
    advance(HOUR);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('marks a different build, and stops checking once it knows', async () => {
    const { fetchImpl, advance } = setup();
    advance(HOUR);
    focus();
    await settle();
    expect(watch!.changed()).toBe(true);
    advance(HOUR);
    focus();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats the same build, a failure or a malformed answer as current', async () => {
    for (const answer of [
      async () => Response.json({ build: 'aaa' }),
      async () => Promise.reject(new TypeError('offline')),
      async () => new Response('not found', { status: 404 }),
      async () => new Response('<html>', { status: 200 }),
      async () => Response.json({ build: '' }),
      async () => Response.json({}),
    ]) {
      const { advance } = setup(answer);
      advance(HOUR);
      focus();
      await settle();
      expect(watch!.changed()).toBe(false);
      watch!.stop();
    }
  });

  it('does nothing without a build ID (the dev server)', async () => {
    const fetchImpl = vi.fn();
    let now = 0;
    watch = startBuildWatch({ build: null, fetchImpl, now: () => now });
    now += HOUR;
    focus();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('staleBuildLoader', () => {
  it('lets the navigation through while the build is current, even with a check still pending', async () => {
    const { advance } = setup(() => new Promise<Response>(() => {}));
    advance(HOUR);
    focus();
    expect(staleBuildLoader(args('https://xboxclips.io/game/1'))).toBeNull();
  });

  it('turns the next navigation into a full load of its destination once a different build is live', async () => {
    const { advance } = setup();
    advance(HOUR);
    focus();
    await settle();
    let thrown: unknown;
    try {
      staleBuildLoader(args('https://xboxclips.io/player/TestPlayer?x=1'));
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get('Location')).toBe('https://xboxclips.io/player/TestPlayer?x=1');
    expect((thrown as Response).headers.get('X-Remix-Reload-Document')).toBe('true');
  });

  it('reloads in place for Back and Forward, which have already moved the browser', async () => {
    const { advance, reload } = setup();
    advance(HOUR);
    focus();
    await settle();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(staleBuildLoader(args('https://xboxclips.io/'))).toBeInstanceOf(Promise);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('forgets a Back that happened while the build was current', async () => {
    const { advance, reload } = setup();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(staleBuildLoader(args('https://xboxclips.io/'))).toBeNull();
    advance(HOUR);
    focus();
    await settle();
    expect(() => staleBuildLoader(args('https://xboxclips.io/game/1'))).toThrow();
    expect(reload).not.toHaveBeenCalled();
  });
});
