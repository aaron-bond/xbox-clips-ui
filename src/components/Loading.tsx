import styles from './Loading.module.css';

/** A spinner with a line of text, while a page waits for the API. Announced to screen readers. */
export function Loading({ label }: { label: string }) {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden />
      <span>{label}</span>
    </div>
  );
}
