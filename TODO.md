# TODO

Live backlog. Finished items keep a short note on what was actually built and
any trade-off made.

## Deployment

- [ ] Check the Pages build uses Node 24 from `.node-version`.
- [ ] Add `www.xboxclips.io` as a Pages custom domain, and a 301 redirect
      rule from `www` to the apex that keeps path and query.

## Open questions (PLAN §9)

- [ ] **Q2: thumbnail as `og:image`.** WhatsApp renders it. Still to check:
      Discord, iMessage, Slack.
- [ ] **Q4: visual design and component library.** Decide once the layout
      has been used for a while.

## Later (PLAN §10)

- [ ] Recent gamertags and favourites, on the device.
- [ ] Designed states for expired clips and restricted players.
- [ ] Show `availableUntil` on the clip page.

## Done

- [x] **Pages project and first deploy** (2026-10-17). Project
      `xbox-clips-ui` with Git integration, live at
      `https://xbox-clips-ui.pages.dev`. The dashboard's "Create application"
      opens the Workers flow; Pages is reached from a separate entry on that
      page. Verified live: routing, deep links, and per-clip preview tags
      served to a crawler via the API service binding.
- [x] **`xboxclips.io` attached** (2026-10-17). Serves the app, deep links
      work, the API allows the origin, and clip previews carry `og:url` on
      the domain.
- [x] **Q1 answered** (2026-10-17). The API sees the visitor's IP as
      `CF-Connecting-IP` on preview requests over the binding, so its per-IP
      limit needs no change.

- [x] **Scaffold per PLAN §11** (2026-10-16). Search, player shelf, clip
      page with playback and one automatic retry, copy and native share, the
      `/clip/*` preview function, CI. 34 tests.
      Trade-offs and choices:
      - TanStack Query retries are off entirely, not just for 4xx: a retry
        after an upstream failure would spend budget on a request the
        visitor didn't make.
      - The shelf requests the profile first, then clips by XUID. Asking by
        gamertag in parallel would make the API resolve the same gamertag
        twice on a first visit.
      - Opening a clip from a shelf reuses the shelf's cached data, so it
        costs no request while the URL is fresh.
      - The function fetches the root page from `ASSETS` explicitly instead
        of relying on `next()`, which settles Q3 by design.
      - No component library yet; dark theme in plain CSS modules.
