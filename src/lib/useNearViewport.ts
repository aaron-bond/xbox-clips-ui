import { useCallback, useEffect, useState } from 'react';

/**
 * True once the element has come within `margin` of the viewport, and stays
 * true. Used to defer work the visitor may never scroll to.
 *
 * `ref` is a callback ref, so observation starts whenever the element appears,
 * including when it renders later than the component that owns it (a page that
 * shows a loading state first).
 */
export function useNearViewport<T extends Element>(margin = '300px') {
  const [el, setEl] = useState<T | null>(null);
  const [near, setNear] = useState(false);
  const ref = useCallback((node: T | null) => setEl(node), []);

  useEffect(() => {
    if (!el || near) return;
    // Without IntersectionObserver, load straight away rather than never.
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, near, margin]);

  return { ref, near };
}
