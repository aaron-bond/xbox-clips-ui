import { useState } from 'react';
import styles from './ShareButtons.module.css';

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4" />
    <path d="m15.4 6.5-6.8 4" />
  </svg>
);

interface Props {
  url: string;
  title: string;
  /** Button text, e.g. "Copy link" or "Copy replay link". */
  label: string;
  /** Solid orange where copying is the page's main job (the clip page); outline elsewhere. */
  primary?: boolean;
}

/**
 * Copy the clip page's URL (the share link, PLAN-v1.md §6), plus the device's
 * share sheet where the browser has one.
 */
export function ShareButtons({ url, title, label, primary = false }: Props) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const kind = primary ? 'btn-primary' : 'btn-outline';

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
      <button type="button" onClick={() => void copy()} className={`${kind} ${styles.copy}`}>
        {copied ? 'Link copied' : label}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={() => void navigator.share({ title, url }).catch(() => {})}
          className={`btn-outline ${styles.share}`}
          aria-label="Share"
          title="Share"
        >
          <ShareIcon />
        </button>
      )}
      <span role="status" className="visually-hidden">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </div>
  );
}
