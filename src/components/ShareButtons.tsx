import { useState } from 'react';
import styles from './ShareButtons.module.css';

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="m5 12 5 5 9-10" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M12 3v12" />
    <path d="m7 8 5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

/**
 * Two icon buttons side by side: copy the clip page's URL (the share link,
 * PLAN-v1.md §6), and open the device's share sheet where the browser has one.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the URL is still in the address bar.
    }
  }

  return (
    <div className={styles.row}>
      <button
        type="button"
        onClick={() => void copy()}
        className={`${styles.icon} ${styles.primary}`}
        aria-label="Copy link"
        title={copied ? 'Link copied' : 'Copy link'}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={() => void navigator.share({ title, url }).catch(() => {})}
          className={styles.icon}
          aria-label="Share"
          title="Share"
        >
          <ShareIcon />
        </button>
      )}
      <span role="status" className={styles.status}>
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </div>
  );
}
