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

// Three connected nodes: the widely recognised "share" symbol. An arrow leaving a
// tray (Apple's share glyph) was tried and reads as "upload" out of context.
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4" />
    <path d="m15.4 6.5-6.8 4" />
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
        className={`btn ${styles.icon}`}
        aria-label="Copy link"
        title={copied ? 'Link copied' : 'Copy link'}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={() => void navigator.share({ title, url }).catch(() => {})}
          className={`btn ${styles.icon}`}
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
