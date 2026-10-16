import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { ClipGrid } from '../components/ClipGrid';
import { ErrorMessage } from '../components/ErrorMessage';
import { ProfileHeader } from '../components/ProfileHeader';
import { clipsQuery, playerQuery } from '../lib/queries';
import { parsePlayerIdentifier } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './PlayerPage.module.css';

export function PlayerPage() {
  const identifier = useParams().identifier ?? '';
  const valid = parsePlayerIdentifier(identifier) !== null;

  const profile = useQuery({ ...playerQuery(identifier), enabled: valid });
  // Clips are requested by XUID once the profile resolves it. Asking by gamertag in
  // parallel would make the API resolve the same gamertag twice, spending an extra
  // upstream search on a first visit.
  const xuid = profile.data?.xuid;
  const clips = useQuery({ ...clipsQuery(xuid ?? ''), enabled: !!xuid });

  if (!valid) return <NotFoundPage />;
  if (profile.isPending) return <p className={styles.loading}>Loading player…</p>;
  if (profile.isError) return <ErrorMessage error={profile.error} />;

  return (
    <>
      <ProfileHeader profile={profile.data} />
      {clips.isPending ? (
        <p className={styles.loading}>Loading clips…</p>
      ) : clips.isError ? (
        <ErrorMessage error={clips.error} onRetry={() => void clips.refetch()} />
      ) : clips.data.access === 'restricted' ? (
        <p className={styles.empty}>This player's clips aren't public.</p>
      ) : clips.data.clips.length === 0 ? (
        <p className={styles.empty}>No clips yet.</p>
      ) : (
        <ClipGrid clips={clips.data.clips} />
      )}
    </>
  );
}
