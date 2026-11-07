import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
// Imported first so the browser's install offer is caught however early it fires.
import './lib/install';
import { currentBuild, routerOptions, startBuildWatch } from './lib/build';
import { createQueryClient } from './lib/queries';
import { routes } from './routes';
import './styles/global.css';

const queryClient = createQueryClient();
// Before the router, so it sees Back and Forward first (PLAN-v1.md §15).
startBuildWatch({ build: currentBuild() });
const router = createBrowserRouter(routes, routerOptions);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
