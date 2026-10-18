import { useParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { PageHeader } from '../components/PageHeader';
import { IntroStage } from '../components/PlayerIntro';
import { UpNext } from '../components/UpNext';
import { playerPath } from '../lib/format';
import { useIntroGate } from '../lib/useIntroGate';
import { usePlayerReel } from '../lib/usePlayerReel';
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
  const { profile, clips, profileDown, ready } = usePlayerReel(identifier);
  const intro = useIntroGate(ready);
  return <IntroStage phase={intro} name={name} profile={profile.data} page={content} />;

  function content() {
    if (profile.isPending) return null;
    if (profile.isError && !profileDown) return <ErrorMessage error={profile.error} />;
    if (clips.isPending) return null;
    if (clips.isError) return <ErrorMessage error={profileDown ? profile.error : clips.error} onRetry={() => void clips.refetch()} />;
    const reel = clips.data.clips;
    const p = profile.data;
    return (
      <div className={styles.page}>
        <PageHeader
          gamertag={p?.gamertag ?? name ?? 'This player'}
          gamerpicUrl={p?.gamerpicUrl ?? null}
          kicker="Clips"
          back={{ to: playerPath(identifier), label: 'Back to player' }}
        />
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
