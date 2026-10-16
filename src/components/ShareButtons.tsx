import { useState } from 'react';
import styles from './ShareButtons.module.css';

/** Copies the clip page's own URL, which is the share link (PLAN-v1.md §6). */
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
      <button type="button" onClick={() => void copy()} className={styles.primary}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={() => void navigator.share({ title, url }).catch(() => {})}
          className={styles.secondary}
        >
          Share…
        </button>
      )}
      <span role="status" className={styles.status}>
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </div>
  );
}
