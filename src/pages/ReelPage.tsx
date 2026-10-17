import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { IntroStage } from '../components/PlayerIntro';
import { UpNext } from '../components/UpNext';
import { playerPath } from '../lib/format';
import { clipsQuery, playerQuery } from '../lib/queries';
import { useIntroGate } from '../lib/useIntroGate';
import { parsePlayerIdentifier } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './ReelPage.module.css';

/**
 * A player's whole reel on its own page, reached from the player page's cut-down
 * Up next. It reads the same cached profile and clip list, so arriving from the
 * player page costs no requests.
 */
export function ReelPage() {
  const identifier = useParams().identifier ?? '';
  const parsed = parsePlayerIdentifier(identifier);
  if (!parsed) return <NotFoundPage />;
  return <Reel key={identifier} identifier={identifier} name={parsed.kind === 'gamertag' ? parsed.gamertag : null} />;
}

function Reel({ identifier, name }: { identifier: string; name: string | null }) {
  const profile = useQuery(playerQuery(identifier));
  const xuid = profile.data?.xuid;
  const clips = useQuery({ ...clipsQuery(xuid ?? ''), enabled: !!xuid });
  const intro = useIntroGate(profile.isError || (profile.isSuccess && !clips.isPending));
  return <IntroStage phase={intro} name={name} profile={profile.data} page={content} />;

  function content() {
    if (profile.isPending) return null;
    if (profile.isError) return <ErrorMessage error={profile.error} />;
    if (clips.isPending) return null;
    if (clips.isError) return <ErrorMessage error={clips.error} onRetry={() => void clips.refetch()} />;
    const reel = clips.data.clips;
    const p = profile.data;
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          {p.gamerpicUrl ? (
            <img src={p.gamerpicUrl} alt="" width={56} height={56} className={styles.pic} />
          ) : (
            <span className={styles.pic} aria-hidden />
          )}
          <h1 className={styles.name}>{p.gamertag}</h1>
          <Link to={playerPath(identifier)} className={`btn-outline ${styles.back}`}>
            Back to player
          </Link>
        </header>
        {reel.length > 0 ? (
          <UpNext clips={reel} title={reel.length === 1 ? 'The only clip' : `All ${reel.length} clips`} />
        ) : (
          <p className={styles.empty}>
            {clips.data.access === 'restricted' ? "This player's clips aren't public." : 'Nothing captured yet.'}
          </p>
        )}
      </div>
    );
  }
}
