import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { Achievement, GameAchievements } from '../api/types';
import { ErrorMessage } from '../components/ErrorMessage';
import { achievementsPath, formatDate, formatPlaytime, playerPath } from '../lib/format';
import { storeImage } from '../lib/games';
import { achievementsQuery, playerQuery } from '../lib/queries';
import { parsePlayerIdentifier } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './GameAchievementsPage.module.css';

type Tab = 'all' | 'unlocked' | 'progress' | 'locked';

const TITLE_ID = /^\d{1,10}$/;

/**
 * A player's achievements in one game (PLAN-v1.md §11, P2): progress, rarity
 * and unlock dates. Secret achievements stay hidden until unlocked or tapped.
 */
export function GameAchievementsPage() {
  const params = useParams();
  const identifier = params.identifier ?? '';
  const titleId = params.titleId ?? '';
  const valid = parsePlayerIdentifier(identifier) !== null && TITLE_ID.test(titleId);
  const profile = useQuery({ ...playerQuery(identifier), enabled: valid });
  const list = useQuery({ ...achievementsQuery(identifier, titleId), enabled: valid });
  if (!valid) return <NotFoundPage />;
  if (list.isPending) return <div className={styles.placeholder} aria-busy="true" />;
  if (list.isError) return <ErrorMessage error={list.error} onRetry={() => void list.refetch()} />;
  return <Achievements data={list.data} identifier={identifier} gamertag={profile.data?.gamertag ?? identifier} gamerpicUrl={profile.data?.gamerpicUrl ?? null} />;
}

const unlocked = (a: Achievement) => a.unlockedAt !== null;
const inProgress = (a: Achievement) => !unlocked(a) && a.progress !== null;

/** Newest unlocks first, then those furthest along, then the rest in the game's order. */
function ordered(list: Achievement[]): Achievement[] {
  const pct = (a: Achievement) => (a.progress ? a.progress.current / a.progress.target : 0);
  return [
    ...list.filter(unlocked).sort((a, b) => b.unlockedAt!.localeCompare(a.unlockedAt!)),
    ...list.filter(inProgress).sort((a, b) => pct(b) - pct(a)),
    ...list.filter((a) => !unlocked(a) && !inProgress(a)),
  ];
}

function Achievements({ data, identifier, gamertag, gamerpicUrl }: { data: GameAchievements; identifier: string; gamertag: string; gamerpicUrl: string | null }) {
  const [tab, setTab] = useState<Tab>('all');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const all = ordered(data.achievements);
  const earned = all.filter(unlocked);
  const name = data.game?.name ?? data.titleName ?? 'Achievements';
  const gs = earned.reduce((n, a) => n + a.gamerscore, 0);
  const total = data.lockedListed ? all.reduce((n, a) => n + a.gamerscore, 0) : (data.game?.totalGamerscore ?? 0);
  const rarest = earned.filter((a) => a.rarity).sort((a, b) => a.rarity!.percent - b.rarity!.percent)[0];
  const counts = { all: all.length, unlocked: earned.length, progress: all.filter(inProgress).length, locked: all.length - earned.length - all.filter(inProgress).length };
  const tabs: [Tab, string][] = [
    ['all', 'All'],
    ['unlocked', 'Unlocked'],
    ...(counts.progress > 0 ? ([['progress', 'In progress']] as [Tab, string][]) : []),
    ...(data.lockedListed && counts.locked > 0 ? ([['locked', 'Locked']] as [Tab, string][]) : []),
  ];
  const shown = all.filter((a) =>
    tab === 'all' ? true : tab === 'unlocked' ? unlocked(a) : tab === 'progress' ? inProgress(a) : !unlocked(a) && !inProgress(a),
  );

  return (
    <article className={styles.page}>
      <header className={styles.banner}>
        {data.game?.imageUrl && <img src={storeImage(data.game.imageUrl, 440)} alt="" className={styles.art} />}
        <div className={styles.strap}>
          <span className={styles.kicker}>Achievements</span>
          <h1 className="strap-title">{name}</h1>
          <Link to={playerPath(identifier)} className={`strap-sub ${styles.player}`}>
            {gamerpicUrl && <img src={gamerpicUrl} alt="" width={26} height={26} />}
            {gamertag} · back to their reel
          </Link>
        </div>
      </header>

      <dl className={data.minutesPlayed != null ? `${styles.stats} ${styles.withTime}` : styles.stats}>
        <div>
          <dt>Gamerscore</dt>
          <dd>
            {gs.toLocaleString()} {total > 0 && <span>/ {total.toLocaleString()} G</span>}
          </dd>
          {total > 0 && (
            <span className={styles.bar}>
              <span style={{ width: `${Math.min(100, Math.round((100 * gs) / total))}%` }} />
            </span>
          )}
        </div>
        <div>
          <dt>Unlocked</dt>
          <dd>
            {earned.length} {data.lockedListed && <span>of {all.length}</span>}
          </dd>
        </div>
        {data.minutesPlayed != null && (
          <div>
            <dt>Time played</dt>
            <dd>{formatPlaytime(data.minutesPlayed)}</dd>
          </div>
        )}
        <div>
          <dt>Rarest unlock</dt>
          <dd className={styles.small}>{rarest ? <>{rarest.name} <span>{rarest.rarity!.percent}% of players</span></> : '–'}</dd>
        </div>
      </dl>

      <section className={styles.list} aria-label="Achievements">
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="group" aria-label="Show">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={tab === id} className={tab === id ? `${styles.tab} ${styles.on}` : styles.tab} onClick={() => setTab(id)}>
                {label} {counts[id]}
              </button>
            ))}
          </div>
          <Link to={achievementsPath(identifier)} className={styles.allGames}>
            All their games
          </Link>
        </div>
        {!data.lockedListed && <p className={styles.note}>Xbox 360 games list only the achievements a player has unlocked.</p>}
        {all.length === 0 && <p className={styles.note}>No achievements to show for this game.</p>}
        <ul className={styles.rows}>
          {shown.map((a) => (
            <AchievementRow key={a.id} a={a} revealed={revealed.has(a.id)} onReveal={() => setRevealed(new Set(revealed).add(a.id))} fallbackArt={data.game?.imageUrl ?? null} />
          ))}
        </ul>
      </section>
    </article>
  );
}

function AchievementRow({ a, revealed, onReveal, fallbackArt }: { a: Achievement; revealed: boolean; onReveal: () => void; fallbackArt: string | null }) {
  const done = unlocked(a);
  const hidden = a.secret && !done && !revealed;
  const art = a.imageUrl ?? (fallbackArt ? storeImage(fallbackArt, 240) : null);
  const pct = a.progress ? Math.round((100 * a.progress.current) / a.progress.target) : 0;
  const rare = a.rarity?.category === 'Rare';
  return (
    <li className={done ? `${styles.row} ${styles.done}` : styles.row}>
      <span className={done ? styles.thumb : `${styles.thumb} ${styles.lockedThumb}`}>
        {art && <img src={art} alt="" loading="lazy" />}
      </span>
      <div className={styles.text}>
        <strong className={styles.achName}>{hidden ? 'Secret achievement' : a.name}</strong>
        {hidden ? (
          <button type="button" className={styles.reveal} onClick={onReveal}>
            Tap to reveal
          </button>
        ) : (
          <span className={styles.desc}>{a.description}</span>
        )}
        {a.rarity && (
          <span className={styles.rarity}>
            <span className={rare ? `${styles.rarityTag} ${styles.rare}` : styles.rarityTag}>{a.rarity.category}</span>
            {a.rarity.percent}% of players
          </span>
        )}
      </div>
      <div className={styles.side}>
        <span className={done ? `${styles.gs} ${styles.gsOn}` : styles.gs}>{a.gamerscore} G</span>
        <span className={styles.status}>{done ? `✓ Unlocked ${formatDate(a.unlockedAt!)}` : a.progress ? `${a.progress.current} / ${a.progress.target}` : 'Locked'}</span>
        {a.progress && !done && (
          <span className={styles.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
            <span style={{ width: `${pct}%` }} />
          </span>
        )}
      </div>
    </li>
  );
}
