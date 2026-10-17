import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { parsePlayerIdentifier } from '../lib/validation';
import styles from './SearchBox.module.css';

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const navigate = useNavigate();
  const id = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    // Validated here so a malformed gamertag never costs an API request.
    if (!parsePlayerIdentifier(raw)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setValue('');
    navigate(`/player/${encodeURIComponent(raw)}`);
  }

  return (
    <form role="search" onSubmit={submit} className={compact ? styles.compact : styles.form}>
      <label htmlFor={id} className="visually-hidden">
        Gamertag
      </label>
      <input
        id={id}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        placeholder="Gamertag"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
        }}
        className={styles.input}
      />
      <button type="submit" className={`btn-primary ${styles.go}`}>
        Go
      </button>
      {invalid && (
        <p id={`${id}-error`} role="alert" className={styles.error}>
          That isn't a valid gamertag.
        </p>
      )}
    </form>
  );
}
