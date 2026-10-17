import type { RouteObject } from 'react-router';
import { ErrorMessage } from './components/ErrorMessage';
import { Layout } from './components/Layout';
import { ClipPage } from './pages/ClipPage';
import { GamePage } from './pages/GamePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlayerPage } from './pages/PlayerPage';
import { ReelPage } from './pages/ReelPage';
import { SearchPage } from './pages/SearchPage';

/** PLAN-v1.md §4. `/clip/:xuid/:clipId` is also the share link. */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <ErrorMessage error={null} />,
    children: [
      { path: '/', element: <SearchPage /> },
      { path: '/player/:identifier', element: <PlayerPage /> },
      { path: '/player/:identifier/clips', element: <ReelPage /> },
      { path: '/clip/:xuid/:clipId', element: <ClipPage /> },
      { path: '/game/:productId', element: <GamePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
