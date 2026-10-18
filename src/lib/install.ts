import { useSyncExternalStore } from 'react';

/**
 * Whether, and how, the site can be installed as an app (PLAN-v1.md §11, P5).
 *
 * - Chromium (Android, desktop Chrome and Edge) fires `beforeinstallprompt` when
 *   the site is installable and not yet installed. The event is kept so the
 *   site's own button can open the browser's install dialog later.
 * - iOS and iPadOS have no such event and no way to install from the page; the
 *   visitor is told to use Share, then Add to Home Screen.
 * - Elsewhere (Firefox, desktop Safari) nothing is offered.
 *
 * Nothing is offered when the site is already running as the installed app.
 */

/** Not in the DOM typings: Chromium only. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'prompt' | 'ios' | null;

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  // Registered at import, before React renders: the event can fire very early.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

const standalone = () =>
  (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS reports itself as a Mac; a touch screen tells them apart.
const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

function mode(): InstallMode {
  if (installed || standalone()) return null;
  if (deferred) return 'prompt';
  return ios() ? 'ios' : null;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, mode, () => null);
}

/** Opens the browser's install dialog. The event can be used only once. */
export async function promptInstall() {
  const event = deferred;
  if (!event) return;
  deferred = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installed = true;
  notify();
}

const DISMISSED = 'xboxclips.install.dismissed';
const DISMISS_FOR = 30 * 24 * 60 * 60 * 1000;

/** The home page banner stays away for 30 days once dismissed. A per-device convenience. */
export function bannerDismissed(now = Date.now()) {
  try {
    const at = Number(localStorage.getItem(DISMISSED));
    return Number.isFinite(at) && at > 0 && now - at < DISMISS_FOR;
  } catch {
    return false;
  }
}

export function dismissBanner(now = Date.now()) {
  try {
    localStorage.setItem(DISMISSED, String(now));
  } catch {
    // Without storage the banner simply comes back on the next visit.
  }
}

/** For tests only: forget any caught install offer and any install. */
export function resetInstallState() {
  deferred = null;
  installed = false;
  notify();
}
