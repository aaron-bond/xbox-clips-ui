import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { recordVisit, togglePin } from '../lib/savedPlayers';
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
    expect(within(card).getByRole('link', { name: /See games/ })).toHaveAttribute('href', '/player/TestPlayer/achievements');
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

  it('opens a game from the home page without another game request', async () => {
    const paths = stubRoutes({ [MOST_PLAYED]: { body: { games } } });
    renderAt('/');
    const section = await screen.findByRole('region', { name: 'Most played on Xbox' });
    await userEvent.click(within(section).getByText('Game 3'));
    expect(await screen.findByRole('heading', { name: 'Game 3', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('No. 3')).toBeInTheDocument();
    // The game comes from the cached ranking; only its screenshots are asked for.
    await waitFor(() => expect(new Set(paths)).toEqual(new Set([MOST_PLAYED, `/api/v1/games/${games[2]!.productId}/screenshots`])));
  });

  const shot = (n: number, caption: string | null = `Shot ${n}`) => ({ url: `https://store-images.test/${n}`, caption, width: 3840, height: 2160 });

  it('shows store screenshots with their captions, stepping through them', async () => {
    const shots = [shot(1), shot(2), shot(3, null), shot(4), shot(5), shot(6)];
    stubRoutes({
      '/api/v1/games/9N4PT8HGCDHQ/screenshots': { body: { screenshots: shots } },
      '/api/v1/games/9N4PT8HGCDHQ': { body: makeGame({ title: 'Solo' }) },
    });
    renderAt('/game/9N4PT8HGCDHQ');
    const section = await screen.findByRole('region', { name: /Screenshots/ });
    const featured = section.querySelector('figure')!;
    expect(within(featured).getByText('1 / 6')).toBeInTheDocument();
    expect(within(featured).getByText('Shot 1')).toBeInTheDocument();
    expect(within(featured).getByRole('img', { name: 'Shot 1' })).toHaveAttribute('src', 'https://store-images.test/1?w=1280');
    expect(within(section).getByRole('button', { name: '+2 more' })).toBeInTheDocument();

    await userEvent.click(within(section).getByRole('button', { name: 'Next screenshot' }));
    expect(within(featured).getByText('2 / 6')).toBeInTheDocument();
    // No caption: no caption bar, and an empty alt.
    await userEvent.click(within(section).getByRole('button', { name: 'Show screenshot 3' }));
    expect(within(featured).getByText('3 / 6')).toBeInTheDocument();
    expect(featured.querySelector('figcaption')).toBeNull();
  });

  it('leaves the screenshots section out when a game has none, or they fail to load', async () => {
    stubRoutes({
      '/api/v1/games/9N4PT8HGCDHQ/screenshots': { body: { screenshots: [] } },
      '/api/v1/games/9N4PT8HGCDHQ': { body: makeGame({ title: 'Solo' }) },
    });
    const first = renderAt('/game/9N4PT8HGCDHQ');
    await screen.findByRole('heading', { name: 'Solo', level: 1 });
    await waitFor(() => expect(screen.queryByRole('region', { name: /Screenshots/ })).toBeNull());
    first.unmount();

    stubRoutes({
      '/api/v1/games/9N4PT8HGCDHQ/screenshots': apiError('UPSTREAM_ERROR', 502),
      '/api/v1/games/9N4PT8HGCDHQ': { body: makeGame({ title: 'Solo' }) },
    });
    renderAt('/game/9N4PT8HGCDHQ');
    await screen.findByRole('heading', { name: 'Solo', level: 1 });
    await waitFor(() => expect(document.querySelector('[class*="placeholder"]')).toBeNull());
    expect(screen.queryByRole('region', { name: /Screenshots/ })).toBeNull();
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

describe('pinned and recent players', () => {
  const visit = () => stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf([makeClip({})]) } });

  it('shows nothing on the home page until a player has been viewed', async () => {
    stubRoutes({});
    renderAt('/');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('region', { name: 'Recent' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Pinned' })).toBeNull();
  });

  it('adds a viewed player to Recent on the home page', async () => {
    visit();
    const { router } = renderAt('/player/TestPlayer');
    await screen.findByRole('region', { name: 'Player card' });
    await router.navigate('/');
    const recent = await screen.findByRole('region', { name: 'Recent' });
    expect(within(recent).getByRole('link', { name: /TestPlayer/ })).toHaveAttribute('href', '/player/TestPlayer');
    expect(within(recent).getByText('Viewed today')).toBeInTheDocument();
  });

  it('pins from the player card, moving the player from Recent to Pinned', async () => {
    visit();
    const { router } = renderAt('/player/TestPlayer');
    const pin = await screen.findByRole('button', { name: /Pin/ });
    expect(pin).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(pin);
    expect(screen.getByRole('button', { name: /Pinned/ })).toHaveAttribute('aria-pressed', 'true');
    await router.navigate('/');
    const pinned = await screen.findByRole('region', { name: 'Pinned' });
    expect(within(pinned).getByRole('link', { name: /TestPlayer/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Recent' })).toBeNull();
  });

  it('clears Recent but keeps Pinned', async () => {
    togglePin({ xuid: '1', gamertag: 'Kept', gamerpicUrl: null });
    recordVisit({ xuid: '2', gamertag: 'Gone', gamerpicUrl: null });
    stubRoutes({});
    renderAt('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Clear recent' }));
    expect(screen.queryByRole('region', { name: 'Recent' })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Pinned' })).getByText('Kept')).toBeInTheDocument();
  });

  it('lists saved players in the header search, filtered as you type, and opens one from the keyboard', async () => {
    togglePin({ xuid: '1', gamertag: 'Pinned One', gamerpicUrl: null });
    recordVisit({ xuid: '2', gamertag: 'Recent Two', gamerpicUrl: null });
    stubRoutes({ '/api/v1/games/9N4PT8HGCDHQ': { body: makeGame({ title: 'Solo' }) } });
    const { router } = renderAt('/game/9N4PT8HGCDHQ');
    await screen.findByRole('heading', { name: 'Solo', level: 1 });
    const box = screen.getByRole('combobox', { name: 'Gamertag' });
    await userEvent.click(box);
    const list = screen.getByRole('listbox', { name: 'Pinned and recent players' });
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual([expect.stringContaining('Pinned One'), expect.stringContaining('Recent Two')]);

    await userEvent.type(box, 'rec');
    expect(within(list).getAllByRole('option')).toHaveLength(1);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(router.state.location.pathname).toBe('/player/Recent%20Two');
  });
});

describe('achievements', () => {
  const game = (n: number, extra: Record<string, unknown> = {}) => ({
    titleId: String(100 + n), name: `Game ${n}`, imageUrl: 'https://store-images.test/g', gamerscore: 330, totalGamerscore: 1000, percent: 33,
    lastPlayed: daysFromNow(-6), unlocked: 19, xbox360: false, ...extra,
  });
  const ach = (id: string, extra: Record<string, unknown> = {}) => ({
    id, name: `Ach ${id}`, description: `Do ${id}`, gamerscore: 10, imageUrl: 'https://img.test/a', secret: false, unlockedAt: null, progress: null,
    rarity: { category: 'Common', percent: 40 }, ...extra,
  });
  const list = (extra: Record<string, unknown> = {}) => ({
    xuid: XUID, titleId: '101', game: game(1), titleName: null, lockedListed: true, minutesPlayed: 2019,
    achievements: [
      ach('1', { unlockedAt: '2026-10-01T10:00:00Z', gamerscore: 50, rarity: { category: 'Rare', percent: 4.2 } }),
      ach('2', { unlockedAt: '2026-10-11T10:00:00Z', gamerscore: 20 }),
      ach('3', { progress: { current: 66, target: 100 } }),
      ach('4', { secret: true, gamerscore: 30 }),
      ach('5'),
    ],
    ...extra,
  });

  it("lists a player's recent games, each linking to its achievements", async () => {
    stubRoutes({
      '/api/v1/players/TestPlayer/games': { body: { xuid: XUID, games: [game(1), game(2, { xbox360: true })], limited: true } },
      '/api/v1/players/TestPlayer': { body: profile },
    });
    renderAt('/player/TestPlayer/achievements');
    const section = await screen.findByRole('region', { name: 'Recent games' });
    const links = within(section).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/player/TestPlayer/achievements/101', '/player/TestPlayer/achievements/102']);
    expect(within(links[0]!).getByText('330')).toBeInTheDocument();
    expect(within(links[1]!).getByText('Xbox 360')).toBeInTheDocument();
    expect(screen.getByText('Their last 2 games')).toBeInTheDocument();
  });

  it('says so when a game history is hidden', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer/games': { body: { xuid: XUID, games: [], limited: false } }, '/api/v1/players/TestPlayer': { body: profile } });
    renderAt('/player/TestPlayer/achievements');
    expect(await screen.findByText(/game history isn't public/)).toBeInTheDocument();
  });

  it('shows achievements newest first, filters them, and keeps secrets hidden until revealed', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer/achievements/101': { body: list() }, '/api/v1/players/TestPlayer': { body: profile } });
    renderAt('/player/TestPlayer/achievements/101');
    expect(await screen.findByRole('heading', { level: 1, name: 'Game 1' })).toBeInTheDocument();
    const rows = () => within(screen.getByRole('region', { name: 'Achievements' })).getAllByRole('listitem').map((li) => li.querySelector('strong')!.textContent);
    expect(rows()).toEqual(['Ach 2', 'Ach 1', 'Ach 3', 'Secret achievement', 'Ach 5']);
    expect(screen.getByText('Ach 1', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('33 h 39 m')).toBeInTheDocument();
    expect(screen.queryByText('Do 4')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Tap to reveal' }));
    expect(screen.getByText('Do 4')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Unlocked 2' }));
    expect(rows()).toEqual(['Ach 2', 'Ach 1']);
    await userEvent.click(screen.getByRole('button', { name: 'In progress 1' }));
    expect(rows()).toEqual(['Ach 3']);
    expect(screen.getByText('66 / 100')).toBeInTheDocument();
  });

  it('notes that Xbox 360 games list only unlocked achievements, with no Locked tab', async () => {
    stubRoutes({
      '/api/v1/players/TestPlayer/achievements/101': { body: list({ lockedListed: false, minutesPlayed: null, achievements: [ach('1', { unlockedAt: '2017-09-23T10:00:00Z', imageUrl: null })] }) },
      '/api/v1/players/TestPlayer': { body: profile },
    });
    renderAt('/player/TestPlayer/achievements/101');
    expect(await screen.findByText(/Xbox 360 games list only/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Locked/ })).toBeNull();
    expect(screen.queryByText('Time played')).toBeNull();
  });

  it('links each career card to its achievements', async () => {
    const stats = { nowPlaying: game(1), biggestHaul: game(2), onTheBrink: game(3, { gamerscore: 900 }), gamesCounted: 3, limited: false };
    stubRoutes({
      '/api/v1/players/TestPlayer': { body: profile },
      [`/api/v1/players/${XUID}/clips`]: { body: clipsOf([makeClip({})]) },
      [`/api/v1/players/${XUID}/career`]: { body: { xuid: XUID, stats } },
    });
    renderAt('/player/TestPlayer');
    await screen.findByText('Game 2');
    const section = screen.getByRole('region', { name: 'Career stats' });
    const hrefs = within(section).getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/player/TestPlayer/achievements/101', '/player/TestPlayer/achievements/102', '/player/TestPlayer/achievements/103']));
  });
});
