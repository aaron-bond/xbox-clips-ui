import { redirectDocument, type LoaderFunctionArgs } from 'react-router';

/**
 * Open tabs and new builds (PLAN-v1.md §15). A tab learns in the background that
 * a different build is live, and its next navigation becomes a full page load.
 * Nothing here ever holds up a navigation: the check runs on its own, and the
 * route only reads its result.
 */

export const CHECK_INTERVAL = 60 * 60 * 1000;

/** This page's build ID, which the build stamps into index.html. Null in the dev server and tests. */
export function currentBuild(doc: Document = document): string | null {
  return doc.querySelector<HTMLMetaElement>('meta[name="app-build"]')?.content || null;
}

export interface BuildWatch {
  /** A different build is live: the next navigation should load it. */
  changed(): boolean;
  /** Whether the navigation being loaded came from Back or Forward. Reading it clears it. */
  takePopped(): boolean;
  reload(): void;
  stop(): void;
}

export interface BuildWatchOptions {
  build: string | null;
  fetchImpl?: typeof fetch;
  now?: () => number;
  win?: Window;
  doc?: Document;
}

let active: BuildWatch | null = null;

/**
 * Starts watching for a different build. Call before the router is created, so
 * Back and Forward are seen before the router acts on them.
 */
export function startBuildWatch({
  build,
  fetchImpl = (...a) => fetch(...a),
  now = Date.now,
  win = window,
  doc = document,
}: BuildWatchOptions): BuildWatch {
  let different = false;
  let popped = false;
  // A tab that has only just loaded is current, so the first check waits an hour.
  let lastCheck = now();

  const check = () => {
    if (!build || different || now() - lastCheck < CHECK_INTERVAL) return;
    lastCheck = now();
    // Fire and forget: a failure is simply retried at the next check.
    void fetchImpl('/version.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        const id = (body as { build?: unknown } | null)?.build;
        // Different, not newer: a rolled-back deploy moves open tabs back too.
        if (typeof id === 'string' && id !== '' && id !== build) different = true;
      })
      .catch(() => {});
  };
  const onVisibility = () => {
    if (doc.visibilityState === 'visible') check();
  };
  const onPop = () => {
    popped = true;
  };

  // Every way a tab goes stale passes through one of these: brought back to the
  // front, woken from sleep, restored from the back/forward cache.
  doc.addEventListener('visibilitychange', onVisibility);
  win.addEventListener('focus', check);
  win.addEventListener('pageshow', check);
  win.addEventListener('popstate', onPop);

  const watch: BuildWatch = {
    changed: () => different,
    takePopped: () => {
      const was = popped;
      popped = false;
      return was;
    },
    reload: () => win.location.reload(),
    stop: () => {
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('focus', check);
      win.removeEventListener('pageshow', check);
      win.removeEventListener('popstate', onPop);
      if (active === watch) active = null;
    },
  };
  active = watch;
  return watch;
}

/**
 * The root route's loader: runs before every navigation, and only reads the
 * watch. With a different build live, it loads the destination as a full page.
 * Back and Forward have already moved the browser, so those reload in place;
 * loading the URL afresh would add a duplicate history entry.
 */
export function staleBuildLoader({ request }: LoaderFunctionArgs): null | Promise<never> {
  const popped = active?.takePopped() ?? false;
  if (!active?.changed()) return null;
  if (popped) {
    active.reload();
    return new Promise<never>(() => {});
  }
  throw redirectDocument(request.url);
}

/** The root route's ID, and the router option that skips its loader on first load: a fresh page is current. */
export const ROOT_ROUTE_ID = 'root';
export const routerOptions = { hydrationData: { loaderData: { [ROOT_ROUTE_ID]: null } } };
