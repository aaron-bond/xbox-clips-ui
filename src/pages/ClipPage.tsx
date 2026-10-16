import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ClipPlayer } from '../components/ClipPlayer';
import { ErrorMessage } from '../components/ErrorMessage';
import { ShareButtons } from '../components/ShareButtons';
import { clipPath, clipTitle, formatDate, formatDuration } from '../lib/format';
import { clipQuery } from '../lib/queries';
import { isClipId, isXuid } from '../lib/validation';
import { NotFoundPage } from './NotFoundPage';
import styles from './ClipPage.module.css';

export function ClipPage() {
  const { xuid = '', clipId = '' } = useParams();
  const valid = isXuid(xuid) && isClipId(clipId);
  const queryClient = useQueryClient();
  const clip = useQuery({ ...clipQuery(queryClient, xuid, clipId), enabled: valid });

  if (!valid) return <NotFoundPage />;
  if (clip.isPending) return <p className={styles.loading}>Loading clip…</p>;
  if (clip.isError) return <ErrorMessage error={clip.error} />;

  const data = clip.data;
  const title = clipTitle(data);
  const shareUrl = `${window.location.origin}${clipPath(data.xuid, data.clipId)}`;

  return (
    <article className={styles.page}>
      <ClipPlayer clip={data} refresh={async () => (await clip.refetch()).data} />
      <div className={styles.details}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>
            {data.caption && data.gameTitle ? `${data.gameTitle} · ` : ''}
            {formatDuration(data.durationSeconds)} · {formatDate(data.recordedAt)} · {data.views.toLocaleString()}{' '}
            views
          </p>
          <Link to={`/player/${data.xuid}`} className={styles.more}>
            More from this player
          </Link>
        </div>
        <ShareButtons url={shareUrl} title={title} />
      </div>
    </article>
  );
}
