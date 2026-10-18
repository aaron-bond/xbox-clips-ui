import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { playerPath } from '../lib/format';
import { useSavedPlayers, type SavedPlayer } from '../lib/savedPlayers';
import { daysAgo } from '../lib/stats';
import { parsePlayerIdentifier } from '../lib/validation';
import { PlayerAvatar } from './SavedPlayers';
import styles from './SearchBox.module.css';

/**
 * Gamertag search. The compact header version also lists the visitor's pinned
 * and recent players while focused, filtered by what has been typed; it is a
 * combobox, so the arrow keys, Enter and Escape work as expected.
 */
export function SearchBox({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const saved = useSavedPlayers();
  const id = useId();

  const query = value.trim().toLowerCase();
  const matches = (p: SavedPlayer) => !query || p.gamertag.toLowerCase().includes(query);
  const pinned = compact ? saved.pinned.filter(matches) : [];
  const recent = compact ? saved.recent.filter(matches) : [];
  const options = [...pinned, ...recent];
  const listOpen = open && options.length > 0;
  const optionId = (n: number) => `${id}-option-${n}`;

  function go(path: string) {
    setValue('');
    setOpen(false);
    setActive(-1);
    navigate(path);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (listOpen && active >= 0) return go(playerPath(options[active]!.gamertag));
    const raw = value.trim();
    // Validated here so a malformed gamertag never costs an API request.
    if (!parsePlayerIdentifier(raw)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    go(playerPath(raw));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!compact) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (options.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((n) => (n + step + options.length + (n < 0 && step < 0 ? 1 : 0)) % options.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  const option = (p: SavedPlayer, n: number, isPinned: boolean) => (
    <li
      key={p.xuid}
      id={optionId(n)}
      role="option"
      aria-selected={active === n}
      className={active === n ? `${styles.option} ${styles.active}` : styles.option}
      // Mouse down, not click: the input's blur would close the list first.
      onMouseDown={(e) => {
        e.preventDefault();
        go(playerPath(p.gamertag));
      }}
    >
      <PlayerAvatar player={p} className={styles.optionAvatar} />
      <span className={styles.optionName}>{p.gamertag}</span>
      {isPinned ? (
        <span className={styles.star} aria-hidden>
          ★
        </span>
      ) : (
        <span className={styles.seen}>{daysAgo(p.at)}</span>
      )}
    </li>
  );

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
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
          setOpen(true);
          setActive(-1);
        }}
        className={styles.input}
        {...(compact && {
          role: 'combobox',
          'aria-expanded': listOpen,
          'aria-controls': `${id}-list`,
          'aria-autocomplete': 'list' as const,
          'aria-activedescendant': listOpen && active >= 0 ? optionId(active) : undefined,
          onFocus: () => setOpen(true),
          onBlur: () => {
            setOpen(false);
            setActive(-1);
          },
          onKeyDown,
        })}
      />
      <button type="submit" className={`btn-primary ${styles.go}`}>
        Go
      </button>
      {compact && (
        <div className={styles.dropdown} hidden={!listOpen}>
          <ul id={`${id}-list`} role="listbox" aria-label="Pinned and recent players" className={styles.list}>
            {pinned.length > 0 && (
              <li role="presentation" className={styles.group}>
                Pinned
              </li>
            )}
            {pinned.map((p, n) => option(p, n, true))}
            {recent.length > 0 && (
              <li role="presentation" className={styles.group}>
                Recent
              </li>
            )}
            {recent.map((p, n) => option(p, pinned.length + n, false))}
          </ul>
          <p className={styles.hint}>Type a gamertag to search, or pick a player. Kept on this device only.</p>
        </div>
      )}
      {invalid && (
        <p id={`${id}-error`} role="alert" className={styles.error}>
          That isn't a valid gamertag.
        </p>
      )}
    </form>
  );
}
