import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetInstallState } from '../lib/install';
import { InstallBanner, InstallLink } from './Install';

/** Fires Chromium's install offer, as the browser would. */
function offerInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe('install prompt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    act(() => resetInstallState());
  });

  it('offers nothing where the browser cannot install', () => {
    const { container } = render(
      <>
        <InstallBanner />
        <InstallLink />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens the browser's install dialog from the banner, then goes away once installed", async () => {
    render(<InstallBanner />);
    const event = offerInstall();
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole('heading', { name: 'Get the app' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole('heading', { name: 'Get the app' })).toBeNull();
  });

  it('gives the Share-menu steps on iPhone, with no button', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15');
    render(<InstallBanner />);
    expect(screen.getByText(/Share in the browser toolbar, then Add to Home Screen\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull();
  });

  it('stays away once dismissed, while the footer link remains', async () => {
    const first = render(<InstallBanner />);
    offerInstall();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('heading', { name: 'Get the app' })).toBeNull();
    first.unmount();
    render(
      <>
        <InstallBanner />
        <InstallLink />
      </>,
    );
    expect(screen.queryByRole('heading', { name: 'Get the app' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Install the app' })).toBeInTheDocument();
  });

  it('offers nothing inside the installed app', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(display-mode: standalone)' }) as MediaQueryList);
    render(<InstallBanner />);
    offerInstall();
    expect(screen.queryByRole('heading', { name: 'Get the app' })).toBeNull();
    vi.unstubAllGlobals();
  });
});
