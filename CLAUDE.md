# CLAUDE.md

Fast way back into this repo. [PLAN-v1.md](PLAN-v1.md) is the authoritative
design, with the reasoning for every decision; this file is the map and the
rules that must not be broken.

## What this is

React + Vite + TypeScript single-page app on Cloudflare Pages, with one Pages
Function for link previews. Talks to the xbox-clips-api Worker: from the
browser over CORS, and from the function over a service binding.

## Map

| Path | Role |
| :--- | :--- |
| `src/main.tsx`, `src/routes.tsx` | Entry point; routes (`/`, `/player/:identifier`, `/clip/:xuid/:clipId`). |
| `src/api/` | Typed API client and response types. `ApiError.message` is user-safe. |
| `src/lib/queries.ts` | TanStack Query client and query definitions: budget-safe defaults, media-expiry staleness, shelf-to-clip seeding. |
| `src/lib/validation.ts` | Identifier rules mirroring the API. Shared with the function. |
| `src/pages/`, `src/components/` | Pages and components, each with a CSS module. |
| `src/components/Replay.tsx` | A clip as a broadcast replay: badges, name strap, autoplay, one-retry playback. |
| `src/components/Ticker.tsx`, `MostPlayed.tsx` | The most-played band on every page; the home page's ranking. |
| `src/components/PlayerCard.tsx`, `UpNext.tsx` | Player stats and expiry notice; the rest of a reel. |
| `src/lib/stats.ts` | Stats derived from data already loaded (last clip, reel length, expiry). |
| `src/styles/global.css` | Kingfisher tokens and the shared broadcast pieces (`.strap`, `.badge`, `.btn-primary`). |
| `functions/clip/[xuid]/[clipId].ts` | Pages Function: adds the clip's preview tags to the app page. |
| `functions/_lib/preview.ts` | Preview tag building, API call over the binding, HTMLRewriter. |
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
- Local `npm run dev` uses the production API and the shared budget. One
  lookup at a time.
- Open items are in [TODO.md](TODO.md) and PLAN §9/§13. Proposed features: PLAN §11. Code marker:
  `TODO(Q1)` for client-IP forwarding over the service binding.

## Commands

`npm run dev` · `npm test` · `npm run typecheck` · `npm run build`
