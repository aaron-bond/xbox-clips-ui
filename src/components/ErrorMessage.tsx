import { ApiError } from '../api/client';
import styles from './ErrorMessage.module.css';

/** Shows the API's own message, which is fixed user-safe text per error code. */
export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong.';
  return (
    <div role="alert" className={styles.box}>
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary">
          Try again
        </button>
      )}
    </div>
  );
}
