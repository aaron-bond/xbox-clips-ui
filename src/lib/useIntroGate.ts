import { useEffect, useRef, useState } from 'react';

/**
 * The player intro's timing (PLAN-v1.md §12). The intro covers a slow load, so
 * it never appears on a fast one, never flashes once it has, and never holds a
 * page longer than its minimum.
 */
export const INTRO_TIMING = {
  /** Data ready sooner than this: no intro at all. */
  showAfter: 600,
  /** Once shown, the intro stays at least this long. */
  minShown: 700,
  /** The exit wipe. Matches the animations in PlayerIntro.module.css. */
  exit: 520,
  exitReducedMotion: 250,
};

/**
 * - `waiting`: not ready, intro not yet due. Show nothing.
 * - `showing`: the intro.
 * - `leaving`: the page, with the intro's exit wipe playing over it.
 * - `done`: the page.
 */
export type IntroPhase = 'waiting' | 'showing' | 'leaving' | 'done';

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Data already ready on mount (a cached player) goes straight to `done`. */
export function useIntroGate(ready: boolean): IntroPhase {
  const [phase, setPhase] = useState<IntroPhase>(ready ? 'done' : 'waiting');
  const shownAt = useRef(0);

  useEffect(() => {
    if (phase === 'waiting') {
      if (ready) return setPhase('done');
      const t = setTimeout(() => {
        shownAt.current = Date.now();
        setPhase('showing');
      }, INTRO_TIMING.showAfter);
      return () => clearTimeout(t);
    }
    if (phase === 'showing' && ready) {
      const t = setTimeout(() => setPhase('leaving'), Math.max(0, shownAt.current + INTRO_TIMING.minShown - Date.now()));
      return () => clearTimeout(t);
    }
    if (phase === 'leaving') {
      const t = setTimeout(() => setPhase('done'), prefersReducedMotion() ? INTRO_TIMING.exitReducedMotion : INTRO_TIMING.exit);
      return () => clearTimeout(t);
    }
  }, [phase, ready]);

  return phase;
}
