import { useState } from 'react';
import { bannerDismissed, dismissBanner, promptInstall, useInstallMode } from '../lib/install';
import styles from './Install.module.css';

/** The iOS Share icon, so the steps point at the browser's button and not the site's. */
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden className={styles.shareIcon}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M8 10H6v11h12V10h-2" />
  </svg>
);

/** iPhone and iPad install only from the browser's Share menu. */
const IosSteps = () => (
  <>
    Tap <ShareIcon /> Share in the browser toolbar, then Add to Home Screen.
  </>
);

/**
 * The home page's install banner: the browser's install dialog where there is
 * one, the Share-menu steps on iPhone and iPad. Dismissed, it stays away for
 * 30 days; the footer link remains.
 */
export function InstallBanner() {
  const mode = useInstallMode();
  const [dismissed, setDismissed] = useState(bannerDismissed);
  if (!mode || dismissed) return null;
  return (
    <aside className={styles.banner} aria-labelledby="install-heading">
      <img src="/icons/icon-192.png" alt="" width={56} height={56} className={styles.icon} />
      <div className={styles.text}>
        <h2 id="install-heading" className={styles.title}>
          Get the app
        </h2>
        <p className={styles.sub}>
          Xbox Clips on your home screen, in its own window. No store needed.
          {mode === 'ios' && (
            <strong className={styles.steps}>
              {' '}
              <IosSteps />
            </strong>
          )}
        </p>
      </div>
      {mode === 'prompt' && (
        <button type="button" className={`btn-primary ${styles.install}`} onClick={() => void promptInstall()}>
          Install
        </button>
      )}
      <button
        type="button"
        className={styles.close}
        aria-label="Dismiss"
        title="Dismiss"
        onClick={() => {
          dismissBanner();
          setDismissed(true);
        }}
      >
        ×
      </button>
    </aside>
  );
}

/** A quiet way back to installing, in the footer of every page. */
export function InstallLink() {
  const mode = useInstallMode();
  if (mode === 'prompt') {
    return (
      <button type="button" className={styles.link} onClick={() => void promptInstall()}>
        Install the app
      </button>
    );
  }
  if (mode === 'ios')
    return (
      <span>
        Install the app: <IosSteps />
      </span>
    );
  return null;
}
