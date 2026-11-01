import type { SyntheticEvent } from 'react';

/**
 * An image's onLoad: marks its container `data-loaded`, so a shimmer behind the
 * image (shown while it loads) can stop.
 */
export const markLoaded = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.parentElement?.setAttribute('data-loaded', '');
};

/**
 * An image's onError: no broken-image icon. The image is removed and the shimmer
 * stops, leaving its container as a plain panel; the name beside it says what it was.
 */
export const hideBroken = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.parentElement?.setAttribute('data-loaded', '');
  e.currentTarget.style.display = 'none';
};
