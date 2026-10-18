import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  apiError,
  CLIP_ID,
  clipsOf,
  daysFromNow,
  makeClip,
  makeGame,
  profile,
  renderAt,
  stubRoutes,
  XUID,
} from '../test/helpers';

const CLIP_B = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';
const games = Array.from({ length: 14 }, (_, i) =>
  makeGame({ rank: i + 1, productId: `9N4PT8HGCD${String(i).padStart(2, '0')}`, title: `Game ${i + 1}` }),
);
const MOST_PLAYED = '/api/v1/games/most-played';
const playerPaths = (paths: string[]) => paths.filter((p) => !p.startsWith(MOST_PLAYED));

describe('search', () => {
  it('rejects an invalid gamertag without a player request', async () => {
    const paths = stubRoutes({});
    const { router } = renderAt('/');
    await userEvent.type(screen.getByLabelText('Gamertag'), 'bad/tag{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent("isn't a valid gamertag");
    expect(router.state.location.pathname).toBe('/');
    expect(playerPaths(paths)).toEqual([]);
  });

  it('navigates to the player page with GO', async () => {
    stubRoutes({ '/api/v1/players/': { body: profile } });
    const { router } = renderAt('/');
    await userEvent.type(screen.getByLabelText('Gamertag'), 'Major Nelson');
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(router.state.location.pathname).toBe('/player/Major%20Nelson');
  });
});

describe('ticker', () => {
  it('shows the most-played ranks on every page, linking to game pages', async () => {
    stubRoutes({ [MOST_PLAYED]: { body: { games } } });
    renderAt('/game/9N4PT8HGCD00');
    const band = await screen.findByRole('navigation', { name: 'Most played on Xbox' });
    const links = within(band).getAllByRole('link');
    expect(links).toHaveLength(10);
    expect(links[0]).toHaveAttribute('href', `/game/${games[0]!.productId}`);
  });

  it('is left out when the ranking cannot load', async () => {
    stubRoutes({ [MOST_PLAYED]: apiError('UPSTREAM_ERROR', 502) });
    renderAt('/');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('navigation', { name: 'Most played on Xbox' })).toBeNull();
  });
});

describe('player page', () => {
  const twoClips = [
    makeClip({ clipId: CLIP_ID, gameTitle: 'Battlefield', durationSeconds: 59, recordedAt: daysFromNow(-41) }),
    makeClip({ clipId: CLIP_B, gameTitle: 'Gears Beta', durationSeconds: 59, recordedAt: daysFromNow(-69), availableUntil: daysFromNow(21), media: { url: 'https://cdn.test/b.mp4', expiresAt: daysFromNow(0.04) } }),
  ];

  it('plays the intro over a slow load, then reveals the reel', async () => {
    let release = () => {};
    const clipsHeld = new Promise<void>((resolve) => (release = resolve));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(String(input)).pathname;
        const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
        if (path === '/api/v1/players/TestPlayer') return json(200, profile);
        if (path === `/api/v1/players/${XUID}/clips`) {
          await clipsHeld;
          return json(200, clipsOf(twoClips));
        }
        const err = apiError('NOT_FOUND', 404);
        return json(err.status, err.body);
      }),
    );
    renderAt('/player/TestPlayer');
    expect(await screen.findByText("Loading TestPlayer's reel", {}, { timeout: 1500 })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Player card' })).toBeNull();
    release();
    await screen.findByRole('region', { name: 'Player card' });
    await waitFor(() => expect(screen.queryByText("Loading TestPlayer's reel")).toBeNull(), { timeout: 1500 });
  });

  it('plays the latest clip as the replay, strap leading with the game, clips requested by XUID', async () => {
    const paths = stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    expect(await screen.findByTestId('clip-video')).toHaveAttribute('src', 'https://cdn.test/clip-1.mp4');
    const strap = screen.getByText('Battlefield', { selector: '.strap-title' });
    expect(strap).toBeInTheDocument();
    expect(screen.getByText(/TestPlayer ·/)).toBeInTheDocument();
    await waitFor(() =>
      expect(new Set(playerPaths(paths))).toEqual(
        new Set(['/api/v1/players/TestPlayer', `/api/v1/players/${XUID}/clips?limit=100`, `/api/v1/players/${XUID}/career`]),
      ),
    );
  });

  it('shows the player card stats from data already loaded', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    const card = await screen.findByRole('region', { name: 'Player card' });
    expect(within(card).getByRole('heading', { name: 'TestPlayer' })).toBeInTheDocument();
    expect(within(card).getByText('1,234')).toBeInTheDocument();
    expect(within(card).getByText('2')).toBeInTheDocument();
    expect(within(card).getByText('41 days ago')).toBeInTheDocument();
    expect(within(card).getByText('1:58')).toBeInTheDocument();
  });

  it('shows reputation, years on Xbox, location and bio when the profile has them', async () => {
    const full = { ...profile, bio: 'Clips from the couch.', location: 'Seattle', tenureYears: 22, reputation: 'good' as const };
    stubRoutes({ '/api/v1/players/TestPlayer': { body: full }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    const card = await screen.findByRole('region', { name: 'Player card' });
    expect(within(card).getByText('Good player')).toBeInTheDocument();
    expect(within(card).getByText(/22 years on Xbox · Seattle/)).toBeInTheDocument();
    expect(within(card).getByText('“Clips from the couch.”')).toBeInTheDocument();
  });

  it('leaves out profile extras that are empty', async () => {
    const sparse = { ...profile, bio: null, location: null, tenureYears: 22, reputation: null };
    stubRoutes({ '/api/v1/players/TestPlayer': { body: sparse }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    const card = await screen.findByRole('region', { name: 'Player card' });
    expect(within(card).getByText('22 years on Xbox')).toBeInTheDocument();
    expect(within(card).queryByText(/“/)).toBeNull();
    expect(within(card).queryByText('Good player')).toBeNull();
  });

  it('warns at the foot of the page when a clip leaves Xbox within 30 days', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    const notice = await screen.findByText(/Gears Beta leaves Xbox around/);
    expect(within(screen.getByRole('region', { name: 'Player card' })).queryByText(/leaves Xbox/)).toBeNull();
    const upNext = screen.getByRole('region', { name: 'Up next' });
    expect(upNext.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides a zero view count and shows a real one', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf([makeClip({ views: 0 })]) } });
    const first = renderAt('/player/TestPlayer');
    await screen.findByTestId('clip-video');
    expect(screen.queryByText(/views?\b/)).toBeNull();
    first.unmount();

    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf([makeClip({ views: 1240 })]) } });
    renderAt('/player/TestPlayer');
    expect(await screen.findByText(/1\.2K views/)).toBeInTheDocument();
  });

  it('shows career stats: now playing, biggest haul, on the brink, most clipped', async () => {
    const game = (name: string, gs: number, total: number, pct: number, days: number) => ({
      titleId: name, name, imageUrl: 'https://store-images.test/x', gamerscore: gs, totalGamerscore: total, percent: pct, lastPlayed: daysFromNow(-days),
    });
    const stats = {
      nowPlaying: game('Recent Game', 330, 1000, 33, 6),
      biggestHaul: game('Big Game', 1260, 2000, 63, 4000),
      onTheBrink: game('Close Game', 900, 1000, 90, 1500),
      gamesCounted: 100,
      limited: true,
    };
    stubRoutes({
      '/api/v1/players/TestPlayer': { body: profile },
      [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) },
      [`/api/v1/players/${XUID}/career`]: { body: { xuid: XUID, stats } },
    });
    renderAt('/player/TestPlayer');
    await screen.findByText('Recent Game');
    const section = screen.getByRole('region', { name: 'Career stats' });
    expect(within(section).getByText('From their last 100 games')).toBeInTheDocument();
    expect(within(section).getByText('Recent Game')).toBeInTheDocument();
    expect(within(section).getByText(/Last played 6 days ago · 330 \/ 1,000 G/)).toBeInTheDocument();
    expect(within(section).getByText('Big Game')).toBeInTheDocument();
    expect(within(section).getByText(/100 G to go/)).toBeInTheDocument();
    expect(within(section).queryByText(/platforms/i)).toBeNull();
    expect(within(section).getByText('Battlefield')).toBeInTheDocument();
    expect(within(section).getByText(/tied with Gears Beta/)).toBeInTheDocument();
  });

  it('gives most clipped box art when it is a career game, or a clip frame otherwise', async () => {
    const career = (titleId: string) => ({
      xuid: XUID,
      stats: {
        nowPlaying: { titleId, name: 'Battlefield', imageUrl: 'https://store-images.test/bf', gamerscore: 1, totalGamerscore: 10, percent: 10, lastPlayed: null },
        biggestHaul: null,
        onTheBrink: null,
        gamesCounted: 40,
        limited: false,
      },
    });
    const clips = [makeClip({ gameTitle: 'Battlefield', titleId: 77, thumbnailUrl: 'https://cdn.test/bf-frame.png' })];
    const artOf = async () => {
      const label = await screen.findByText('Most clipped');
      return label.closest('div')!.querySelector('img')!.getAttribute('src');
    };

    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(clips) }, [`/api/v1/players/${XUID}/career`]: { body: career('77') } });
    const first = renderAt('/player/TestPlayer');
    expect(await artOf()).toContain('https://store-images.test/bf');
    first.unmount();

    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(clips) }, [`/api/v1/players/${XUID}/career`]: { body: career('12') } });
    renderAt('/player/TestPlayer');
    expect(await artOf()).toBe('https://cdn.test/bf-frame.png');
  });

  it('notes the 100-game window only when the player has more games', async () => {
    const stats = { nowPlaying: null, biggestHaul: null, onTheBrink: { titleId: 'x', name: 'Close Game', imageUrl: null, gamerscore: 9, totalGamerscore: 10, percent: 90, lastPlayed: null }, gamesCounted: 40, limited: false };
    stubRoutes({
      '/api/v1/players/TestPlayer': { body: profile },
      [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) },
      [`/api/v1/players/${XUID}/career`]: { body: { xuid: XUID, stats } },
    });
    renderAt('/player/TestPlayer');
    await screen.findByText('Close Game');
    const section = screen.getByRole('region', { name: 'Career stats' });
    expect(within(section).queryByText(/From their last/)).toBeNull();
  });

  it('leaves career stats out when the history is hidden', async () => {
    stubRoutes({
      '/api/v1/players/TestPlayer': { body: profile },
      [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) },
      [`/api/v1/players/${XUID}/career`]: { body: { xuid: XUID, stats: null } },
    });
    renderAt('/player/TestPlayer');
    await screen.findByRole('region', { name: 'Player card' });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Career stats' })).toBeNull());
  });

  it('does not request career stats until the section scrolls near, and holds its place meanwhile', async () => {
    const offScreen = class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    };
    vi.stubGlobal('IntersectionObserver', offScreen);
    const paths = stubRoutes({
      '/api/v1/players/TestPlayer': { body: profile },
      [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) },
      [`/api/v1/players/${XUID}/career`]: { body: { xuid: XUID, stats: null } },
    });
    renderAt('/player/TestPlayer');
    await screen.findByTestId('clip-video');
    expect(screen.getByRole('region', { name: 'Career stats' })).toHaveAttribute('aria-busy', 'true');
    expect(paths.some((p) => p.endsWith('/career'))).toBe(false);
  });

  it('places career stats after up next', async () => {
    stubRoutes({
      '/api/v1/players/TestPlayer': { body: profile },
      [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) },
      [`/api/v1/players/${XUID}/career`]: { body: { xuid: XUID, stats: null } },
    });
    renderAt('/player/TestPlayer');
    const upNext = await screen.findByRole('region', { name: 'Up next' });
    const career = screen.getByRole('region', { name: 'Career stats' });
    expect(upNext.compareDocumentPosition(career) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lists the rest of the reel', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    const upNext = await screen.findByRole('region', { name: 'Up next' });
    expect(within(upNext).getAllByRole('listitem')).toHaveLength(1);
    expect(within(upNext).getByRole('link', { name: /Gears Beta/ })).toHaveAttribute('href', `/clip/${XUID}/${CLIP_B}`);
  });

  const reelOf = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      makeClip({ clipId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, gameTitle: `Game ${i}`, recordedAt: daysFromNow(-i - 1) }),
    );

  it('cuts a long reel down to seven clips and a link to the rest', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(reelOf(12)) } });
    renderAt('/player/TestPlayer');
    const upNext = await screen.findByRole('region', { name: 'Up next' });
    const links = within(upNext).getAllByRole('link');
    expect(links).toHaveLength(8);
    expect(links[7]).toHaveTextContent('See all 12 clips');
    expect(links[7]).toHaveAttribute('href', '/player/TestPlayer/clips');
  });

  it('shows a reel of up to eight more in full', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(reelOf(9)) } });
    renderAt('/player/TestPlayer');
    const upNext = await screen.findByRole('region', { name: 'Up next' });
    expect(within(upNext).getAllByRole('link')).toHaveLength(8);
    expect(within(upNext).queryByText(/See all/)).toBeNull();
  });

  it('leaves out up next when the reel is one clip', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf([twoClips[0]!]) } });
    renderAt('/player/TestPlayer');
    await screen.findByRole('region', { name: 'Player card' });
    expect(screen.queryByRole('region', { name: 'Up next' })).toBeNull();
  });

  it('copies the replay link', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    await userEvent.click(await screen.findByRole('button', { name: 'Copy replay link' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/clip/${XUID}/${CLIP_ID}`);
  });

  it('opens an up-next clip without another clip request', async () => {
    const paths = stubRoutes({
      '/api/v1/players/TestPlayer': { body: profile },
      [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) },
      [`/api/v1/players/${XUID}`]: { body: profile },
    });
    renderAt('/player/TestPlayer');
    await userEvent.click(await screen.findByRole('link', { name: /Gears Beta/ }));
    expect(await screen.findByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(paths.some((p) => p.startsWith('/api/v1/clips/'))).toBe(false);
  });

  it('distinguishes restricted access from an empty reel', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf([], 'restricted') } });
    const first = renderAt('/player/TestPlayer');
    expect(await screen.findByText("This player's clips aren't public.")).toBeInTheDocument();
    first.unmount();

    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf([]) } });
    renderAt('/player/TestPlayer');
    expect(await screen.findByText('Nothing captured yet. Check back after their next session.')).toBeInTheDocument();
  });

  it("shows the API's message when the player is not found", async () => {
    stubRoutes({ '/api/v1/players/': apiError('PLAYER_NOT_FOUND', 404, 'No player with that gamertag or XUID was found.') });
    renderAt('/player/Nobody');
    expect(await screen.findByRole('alert')).toHaveTextContent('No player with that gamertag or XUID was found.');
  });

  it('still shows the reel when Xbox throttles the profile, asking for clips by gamertag', async () => {
    const paths = stubRoutes({
      '/api/v1/players/TestPlayer': apiError('UPSTREAM_RATE_LIMIT', 429),
      '/api/v1/players/TestPlayer/clips': { body: clipsOf([makeClip({ gameTitle: 'Battlefield' })]) },
    });
    renderAt('/player/TestPlayer');
    const card = await screen.findByRole('region', { name: 'Player card' });
    expect(within(card).getByRole('heading', { name: 'TestPlayer' })).toBeInTheDocument();
    expect(within(card).getByText('Profile details unavailable right now')).toBeInTheDocument();
    expect(await screen.findByTestId('clip-video')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(playerPaths(paths)).toContain('/api/v1/players/TestPlayer/clips?limit=100');
  });

  it("shows the profile's error when the clips fail too", async () => {
    stubRoutes({ '/api/v1/players/': apiError('UPSTREAM_RATE_LIMIT', 429, 'Xbox data is temporarily rate-limited.') });
    renderAt('/player/TestPlayer');
    expect(await screen.findByRole('alert')).toHaveTextContent('Xbox data is temporarily rate-limited.');
  });

  it('asks for no clips when the player does not exist', async () => {
    const paths = stubRoutes({ '/api/v1/players/': apiError('PLAYER_NOT_FOUND', 404) });
    renderAt('/player/Nobody');
    await screen.findByRole('alert');
    expect(playerPaths(paths)).toEqual(['/api/v1/players/Nobody']);
  });

  it('treats a malformed identifier as not found, without a player request', () => {
    const paths = stubRoutes({});
    renderAt('/player/bad;tag');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(playerPaths(paths)).toEqual([]);
  });
});

describe('clip page', () => {
  const clipRoutes = (clip = makeClip({ caption: 'Big win' })) => ({
    [`/api/v1/clips/${XUID}/${CLIP_ID}`]: { body: clip },
    [`/api/v1/players/${XUID}/clips`]: { body: clipsOf([clip, makeClip({ clipId: CLIP_B, gameTitle: 'Other Game' })]) },
    [`/api/v1/players/${XUID}`]: { body: profile },
  });

  it('plays the clip with COPY LINK, the reel card and up next', async () => {
    stubRoutes(clipRoutes());
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    expect(await screen.findByTestId('clip-video')).toHaveAttribute('src', 'https://cdn.test/clip-1.mp4');
    expect(screen.getByRole('button', { name: 'Copy link' })).toHaveClass('btn-primary');
    const card = await screen.findByRole('region', { name: 'From the reel of' });
    expect(within(card).getByText('TestPlayer')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'See more' })).toHaveAttribute('href', `/player/${XUID}`);
    expect(await screen.findByRole('link', { name: /Other Game/ })).toBeInTheDocument();
  });

  it('shows a caption on the strap only when there is one', async () => {
    stubRoutes(clipRoutes());
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    expect(await screen.findByText(/“Big win”/)).toBeInTheDocument();
  });

  it('refetches once on a playback error, then waits for the visitor', async () => {
    let n = 0;
    const paths = stubRoutes({
      ...clipRoutes(),
      [`/api/v1/clips/${XUID}/${CLIP_ID}`]: () => {
        n++;
        return { body: makeClip({ media: { url: `https://cdn.test/clip-${n}.mp4`, expiresAt: daysFromNow(0.04) } }) };
      },
    });
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    fireEvent.error(await screen.findByTestId('clip-video'));
    await waitFor(() => expect(screen.getByTestId('clip-video')).toHaveAttribute('src', 'https://cdn.test/clip-2.mp4'));
    fireEvent.error(screen.getByTestId('clip-video'));
    expect(await screen.findByText('This clip failed to play.')).toBeInTheDocument();
    expect(paths.filter((p) => p.startsWith('/api/v1/clips/'))).toHaveLength(2);
  });

  it('starts playing automatically, with sound when the browser allows it', async () => {
    stubRoutes(clipRoutes());
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    const video = (await screen.findByTestId('clip-video')) as HTMLVideoElement;
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1));
    expect(video.muted).toBe(false);
  });

  it('falls back to muted autoplay when sound is not allowed yet', async () => {
    const play = vi.fn().mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError')).mockResolvedValue(undefined);
    HTMLMediaElement.prototype.play = play;
    stubRoutes(clipRoutes());
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    const video = (await screen.findByTestId('clip-video')) as HTMLVideoElement;
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(video.muted).toBe(true);
  });

  it('shows an unavailable state when the API holds no media URL', async () => {
    stubRoutes(clipRoutes(makeClip({ media: null })));
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    expect(await screen.findByText("This clip can't be played right now.")).toBeInTheDocument();
  });

  it("shows the API's message for an expired clip", async () => {
    stubRoutes({ ...clipRoutes(), [`/api/v1/clips/${XUID}/${CLIP_ID}`]: apiError('CLIP_EXPIRED', 410, 'This clip has expired on Xbox and is no longer available.') });
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('This clip has expired on Xbox');
  });
});

describe('home and game page', () => {
  it('shows the top 12 in the most-played section: #1 as the feature, linking to game pages', async () => {
    stubRoutes({ [MOST_PLAYED]: { body: { games } } });
    renderAt('/');
    const section = await screen.findByRole('region', { name: 'Most played on Xbox' });
    const links = within(section).getAllByRole('link');
    expect(links).toHaveLength(12);
    expect(links[0]).toHaveAttribute('href', `/game/${games[0]!.productId}`);
    expect(links[0]).toHaveTextContent('No. 1 this week');
  });

  it('requests sized store images, never the originals', async () => {
    stubRoutes({ [MOST_PLAYED]: { body: { games } } });
    const { container } = renderAt('/');
    await screen.findByRole('region', { name: 'Most played on Xbox' });
    const srcs = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '');
    expect(srcs.length).toBeGreaterThan(0);
    expect(srcs.every((src) => /\?w=\d+$/.test(src))).toBe(true);
  });

  it('opens a game from the home page without another request', async () => {
    const paths = stubRoutes({ [MOST_PLAYED]: { body: { games } } });
    renderAt('/');
    const section = await screen.findByRole('region', { name: 'Most played on Xbox' });
    await userEvent.click(within(section).getByText('Game 3'));
    expect(await screen.findByRole('heading', { name: 'Game 3', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('No. 3')).toBeInTheDocument();
    expect(new Set(paths)).toEqual(new Set([MOST_PLAYED]));
  });

  it('loads a game directly, showing a rating only with enough ratings behind it', async () => {
    stubRoutes({ '/api/v1/games/9N4PT8HGCDHQ': { body: makeGame({ title: 'Solo', rating: 4.3, ratingCount: 58 }) } });
    const first = renderAt('/game/9N4PT8HGCDHQ');
    expect(await screen.findByRole('heading', { name: 'Solo', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/★ 4\.3/)).toBeInTheDocument();
    first.unmount();

    stubRoutes({ '/api/v1/games/9N4PT8HGCDHQ': { body: makeGame({ title: 'Thin', rating: 1, ratingCount: 2 }) } });
    renderAt('/game/9N4PT8HGCDHQ');
    expect(await screen.findByRole('heading', { name: 'Thin', level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/★/)).toBeNull();
  });

  it('lists other most-played games, excluding this one', async () => {
    stubRoutes({ [MOST_PLAYED]: { body: { games } } });
    renderAt(`/game/${games[0]!.productId}`);
    const also = await screen.findByRole('region', { name: 'Also most played' });
    const hrefs = within(also).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(games.slice(1, 5).map((g) => `/game/${g.productId}`));
  });

  it("shows the API's message for a game no longer in the list", async () => {
    stubRoutes({ '/api/v1/games/9N4PT8HGCDHQ': apiError('GAME_NOT_FOUND', 404, "That game isn't in the current most-played list.") });
    renderAt('/game/9N4PT8HGCDHQ');
    expect(await screen.findByRole('alert')).toHaveTextContent("isn't in the current most-played list");
  });

  it('treats a malformed product id as not found, without a game request', () => {
    const paths = stubRoutes({});
    renderAt('/game/not-a-product');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(paths.filter((p) => p.startsWith('/api/v1/games/') && !p.startsWith(MOST_PLAYED))).toEqual([]);
  });
});

describe('reel page', () => {
  const reel = Array.from({ length: 12 }, (_, i) =>
    makeClip({ clipId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, gameTitle: `Game ${i}`, recordedAt: daysFromNow(-i - 1) }),
  );

  it('lists every clip, links back to the player, and asks for nothing else', async () => {
    const paths = stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(reel) } });
    renderAt('/player/TestPlayer/clips');
    const all = await screen.findByRole('region', { name: 'All 12 clips' });
    expect(within(all).getAllByRole('link')).toHaveLength(12);
    expect(screen.getByRole('heading', { level: 1, name: 'TestPlayer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to player' })).toHaveAttribute('href', '/player/TestPlayer');
    expect(new Set(playerPaths(paths))).toEqual(new Set(['/api/v1/players/TestPlayer', `/api/v1/players/${XUID}/clips?limit=100`]));
  });

  it('opens from the player page without asking again', async () => {
    const paths = stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(reel) } });
    const { router } = renderAt('/player/TestPlayer');
    await userEvent.click(await screen.findByRole('link', { name: 'See all 12 clips' }));
    expect(router.state.location.pathname).toBe('/player/TestPlayer/clips');
    await screen.findByRole('region', { name: 'All 12 clips' });
    expect(playerPaths(paths).filter((p) => !p.endsWith('/career'))).toHaveLength(2);
  });
});
