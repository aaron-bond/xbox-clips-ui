# CLAUDE.md

Fast way back into this repo. [PLAN-v1.md](PLAN-v1.md) is the authoritative
design, with the reasoning for every decision; this file is the map and the
rules that must not be broken.

## What this is

React + Vite + TypeScript single-page app on Cloudflare Pages, with Pages
Functions for link previews and the API proxy. Talks to the xbox-clips-api
Worker over a service binding: the browser calls `/api/...` on the site's own
origin, which a function forwards (the API's PLAN §6).

## Map

| Path | Role |
| :--- | :--- |
| `public/manifest.webmanifest`, `public/icons/` | The installable app: manifest and XC monogram icons, rendered from Barlow Condensed (PLAN §11, P5). |
| `src/main.tsx`, `src/routes.tsx` | Entry point; routes (`/`, `/player/:identifier`, `/player/:identifier/clips`, `/clip/:xuid/:clipId`, `/game/:productId`). |
| `src/api/` | Typed API client and response types. `ApiError.message` is user-safe. |
| `src/lib/queries.ts` | TanStack Query client and query definitions: budget-safe defaults, media-expiry staleness, shelf-to-clip seeding. |
| `src/lib/validation.ts` | Identifier rules mirroring the API. Shared with the function. |
| `src/pages/`, `src/components/` | Pages and components, each with a CSS module. |
| `src/components/Replay.tsx` | A clip as a broadcast replay: badges, name strap, autoplay, one-retry playback. |
| `src/components/Ticker.tsx`, `MostPlayed.tsx` | The most-played band on every page; the home page's ranking. |
| `src/components/PlayerCard.tsx`, `UpNext.tsx`, `ExpiryNotice.tsx` | Player stats; the rest of a reel; the clip-deletion notice at the foot of the player page. |
| `src/components/CareerStats.tsx` | Career facts from the API's `/career` route, plus most clipped. |
| `src/components/PlayerIntro.tsx`, `src/lib/useIntroGate.ts` | The name-strap intro over a slow player load, and its timing. |
| `src/components/Screenshots.tsx` | The game page's store screenshots: featured image and thumbnails, or a swipe row on phones. |
| `src/lib/install.ts`, `src/components/Install.tsx` | The install prompt: Chromium's install offer or iOS steps, as a home page banner and a footer link. |
| `src/lib/savedPlayers.ts`, `src/components/SavedPlayers.tsx` | Pinned and recent players in local storage (device only), and the home page's Pinned and Recent sections. |
| `src/components/PageHeader.tsx` | The shared header of a player's secondary pages: picture and gamertag as one link to the player, and an optional Back button (only "Back to games" uses it). |
| `src/pages/AchievementsPage.tsx`, `GameAchievementsPage.tsx` | A player's recent games, and their achievements in one game. |
| `src/lib/usePlayerReel.ts` | Profile and clips for the player and reel pages, including clips by gamertag when the profile is throttled. |
| `src/lib/useNearViewport.ts` | "Has this element come into view yet?": defers work like the career request. |
| `src/lib/build.ts`, `build/build-id.ts` | Open tabs and new builds (PLAN §15): the build ID and `version.json`, the background check, the root route's loader that turns the next navigation into a full load. |
| `src/lib/stats.ts` | Stats derived from data already loaded (last clip, reel length, expiry). |
| `src/styles/global.css` | Kingfisher tokens and the shared broadcast pieces (`.strap`, `.badge`, `.btn-primary`). |
| `functions/clip/[xuid]/[clipId].ts` | Pages Function: adds the clip's preview tags to the app page. |
| `functions/_lib/preview.ts` | Preview tag building, API call over the binding, HTMLRewriter. |
| `functions/api/[[path]].ts`, `functions/_lib/guard.ts` | The API proxy: `/api/*` forwarded over the binding, with the same-origin check. `API_GUARD` in `wrangler.jsonc` is `report` or `enforce`. |
| `src/test/helpers.tsx` | Test fixtures, `stubApi` (fake fetch), `renderAt` (router + query client). |

## Invariants

- **Spend the shared budget only on requests a visitor caused.** No retries,
  no refetch on focus or reconnect, no prefetching, validate before any
  lookup. (PLAN §2, §3)
- **Never play a media URL past `media.expiresAt`.** Clip data goes stale 5
  minutes before it.
- **One automatic refetch on a playback error, then wait for the visitor.**
  (PLAN §5)
- **The share link is the clip page URL.** No separate share route.
- **The preview function never breaks the page.** Every failure serves the
  page unchanged.
- **Design for real data** (PLAN §3): straps lead with the game name; a
  caption shows only when present; views only when above zero.
- **No `public/404.html`.** Its presence switches off Pages' single-page-app
  fallback and breaks every client-side route on reload.

## Working rules

- Tests never call the API: `stubApi` fakes `fetch` in app tests; function
  tests use fake `ASSETS` and `API` bindings.
- Local `npm run dev` forwards `/api` to the production site, so it uses the
  production API and the shared budget. One lookup at a time.
- Commit locally freely; ask before every push. A push to `main` deploys
  through Pages, so list the commits that would go up (short hash and
  subject) and wait for explicit approval each time.
- No real gamertags or XUIDs in the project: not in code, tests, docs,
  TODOs, PLAN or commit messages, and never in history. Use placeholders
  such as `TestPlayer`. Real players must not be associated with the
  project; check the diff and message before every commit.
- Checking a deploy: `npx wrangler pages deployment list --project-name
  xbox-clips-ui` gives the status; to confirm it's live, compare the
  `index-*.js` name served by xboxclips.io with a local `npm run build`. If
  a build fails with "build failed to initialize in time", the fault is
  Cloudflare's: retry it from the dashboard.
- Open items are in [TODO.md](TODO.md) and PLAN §9/§13. Proposed features: PLAN §11. Code marker:
  `TODO(Q1)` for client-IP forwarding over the service binding.

## Commands

`npm run dev` · `npm test` · `npm run typecheck` · `npm run build`
