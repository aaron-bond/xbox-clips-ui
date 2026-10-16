import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiError, CLIP_ID, clipsOf, makeClip, profile, renderAt, stubApi, XUID } from '../test/helpers';

describe('search', () => {
  it('rejects an invalid gamertag without a request', async () => {
    const paths = stubApi(() => ({ body: {} }));
    const { router } = renderAt('/');
    await userEvent.type(screen.getAllByLabelText('Gamertag')[1]!, 'bad/tag{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent("isn't a valid gamertag");
    expect(router.state.location.pathname).toBe('/');
    expect(paths).toEqual([]);
  });

  it('navigates to the player page', async () => {
    stubApi(() => ({ body: profile }));
    const { router } = renderAt('/');
    await userEvent.type(screen.getAllByLabelText('Gamertag')[1]!, 'Major Nelson{Enter}');
    expect(router.state.location.pathname).toBe('/player/Major%20Nelson');
  });
});

describe('player page', () => {
  it('shows the profile and clips, requesting clips by XUID', async () => {
    const paths = stubApi((p) => (p.includes('/clips') ? { body: clipsOf([makeClip({ caption: 'Big win' })]) } : { body: profile }));
    renderAt('/player/TestPlayer');
    expect(await screen.findByRole('heading', { name: 'TestPlayer' })).toBeInTheDocument();
    expect(await screen.findByText('Big win')).toBeInTheDocument();
    expect(paths).toEqual(['/api/v1/players/TestPlayer', `/api/v1/players/${XUID}/clips?limit=100`]);
  });

  it('distinguishes restricted access from no clips', async () => {
    stubApi((p) => (p.includes('/clips') ? { body: clipsOf([], 'restricted') } : { body: profile }));
    renderAt('/player/TestPlayer');
    expect(await screen.findByText("This player's clips aren't public.")).toBeInTheDocument();
  });

  it("shows the API's message when the player is not found", async () => {
    stubApi(() => apiError('PLAYER_NOT_FOUND', 404, 'No player with that gamertag or XUID was found.'));
    renderAt('/player/Nobody');
    expect(await screen.findByRole('alert')).toHaveTextContent('No player with that gamertag or XUID was found.');
  });

  it('treats a malformed identifier as not found, without a request', () => {
    const paths = stubApi(() => ({ body: {} }));
    renderAt('/player/bad;tag');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(paths).toEqual([]);
  });
});

describe('clip page', () => {
  it('plays the clip and offers the share link', async () => {
    stubApi(() => ({ body: makeClip({ caption: 'Big win' }) }));
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    expect(await screen.findByRole('heading', { name: 'Big win' })).toBeInTheDocument();
    expect(screen.getByTestId('clip-video')).toHaveAttribute('src', 'https://cdn.test/clip-1.mp4');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
  });

  it('opens from the shelf without another request', async () => {
    const paths = stubApi((p) => (p.includes('/clips') ? { body: clipsOf([makeClip({ caption: 'Big win' })]) } : { body: profile }));
    renderAt('/player/TestPlayer');
    await userEvent.click(await screen.findByText('Big win'));
    expect(await screen.findByTestId('clip-video')).toBeInTheDocument();
    expect(paths.some((p) => p.startsWith('/api/v1/clips/'))).toBe(false);
  });

  it('refetches once on a playback error, then waits for the visitor', async () => {
    let n = 0;
    const paths = stubApi(() => {
      n++;
      return { body: makeClip({ media: { url: `https://cdn.test/clip-${n}.mp4`, expiresAt: new Date(Date.now() + 3_600_000).toISOString() } }) };
    });
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    fireEvent.error(await screen.findByTestId('clip-video'));
    await waitFor(() => expect(screen.getByTestId('clip-video')).toHaveAttribute('src', 'https://cdn.test/clip-2.mp4'));

    fireEvent.error(screen.getByTestId('clip-video'));
    expect(await screen.findByText('This clip failed to play.')).toBeInTheDocument();
    expect(paths).toHaveLength(2);
  });

  it('shows an unavailable state when the API holds no media URL', async () => {
    stubApi(() => ({ body: makeClip({ media: null }) }));
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    expect(await screen.findByText("This clip can't be played right now.")).toBeInTheDocument();
  });

  it("shows the API's message for an expired clip", async () => {
    stubApi(() => apiError('CLIP_EXPIRED', 410, 'This clip has expired on Xbox and is no longer available.'));
    renderAt(`/clip/${XUID}/${CLIP_ID}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('This clip has expired on Xbox');
  });
});
