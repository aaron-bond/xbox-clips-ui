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

  it('plays the latest clip as the replay, strap leading with the game, clips requested by XUID', async () => {
    const paths = stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    expect(await screen.findByTestId('clip-video')).toHaveAttribute('src', 'https://cdn.test/clip-1.mp4');
    const strap = screen.getByText('Battlefield', { selector: '.strap-title' });
    expect(strap).toBeInTheDocument();
    expect(screen.getByText(/TestPlayer ·/)).toBeInTheDocument();
    expect(playerPaths(paths)).toEqual(['/api/v1/players/TestPlayer', `/api/v1/players/${XUID}/clips?limit=100`]);
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

  it('warns when a clip leaves Xbox within 30 days', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    expect(await screen.findByText(/Gears Beta leaves Xbox around/)).toBeInTheDocument();
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

  it('lists the rest of the reel and closes it', async () => {
    stubRoutes({ '/api/v1/players/TestPlayer': { body: profile }, [`/api/v1/players/${XUID}/clips`]: { body: clipsOf(twoClips) } });
    renderAt('/player/TestPlayer');
    const upNext = await screen.findByRole('region', { name: 'Up next' });
    expect(within(upNext).getByRole('link', { name: /Gears Beta/ })).toHaveAttribute('href', `/clip/${XUID}/${CLIP_B}`);
    expect(within(upNext).getByText(/That's all 2 clips/)).toBeInTheDocument();
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
    expect(within(card).getByRole('link', { name: 'Watch the full reel' })).toHaveAttribute('href', `/player/${XUID}`);
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
