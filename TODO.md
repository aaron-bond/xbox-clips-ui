# TODO

Live backlog. Finished items keep a short note on what was actually built and
any trade-off made.

## Deployment

- [ ] Create the Pages project with Git integration, named `xbox-clips-ui`
      (README, Deployment). If the name is taken, the pages.dev hostname gets
      a suffix and the API's allowed origins must change to match.
- [ ] Check the Pages build uses Node 24 from `.node-version`.
- [ ] Attach `xboxclips.io` and `www.xboxclips.io`; redirect `www` to the apex.

## Open questions (PLAN §9)

- [ ] **Q1: client IP over the service binding.** With the function live,
      check what `CF-Connecting-IP` the API sees on a preview request, and
      settle the API's per-IP limit for it (API TODO, B4).
- [ ] **Q2: thumbnail as `og:image`.** Paste a deployed clip link into
      Discord, WhatsApp, iMessage and Slack, and check the image renders.
- [ ] **Q4: visual design and component library.** Decide once the layout
      has been used for a while.

## Later (PLAN §10)

- [ ] Recent gamertags and favourites, on the device.
- [ ] Designed states for expired clips and restricted players.
- [ ] Show `availableUntil` on the clip page.

## Done

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
