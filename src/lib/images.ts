import type { SyntheticEvent } from 'react';

/**
 * An image's onLoad: marks its container `data-loaded`, so a shimmer behind the
 * image (shown while it loads) can stop.
 */
export const markLoaded = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.parentElement?.setAttribute('data-loaded', '');
};
