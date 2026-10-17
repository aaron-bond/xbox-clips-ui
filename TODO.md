# TODO

Live backlog. Finished items keep a short note on what was actually built and
any trade-off made.

## Open questions (PLAN §9)

- [ ] **Q4: component library.** Palette settled (Midnight Violet); decide
      on a library once the layout has been used for a while.

## Proposed features (PLAN §11)

- [ ] P2: achievement face-off between two gamertags.
- [ ] P5: installable app: manifest, icons, Apple touch icon. No service
      worker needed to install; if one is added, it never caches API
      responses. Icons wait for the palette decision.

## Later (PLAN §10)

- [ ] Recent gamertags and favourites, on the device.
- [ ] Designed states for expired clips and restricted players.
- [ ] Show `availableUntil` on the clip page.

## Done

- [x] **Career stats from the last 100 games** (2026-10-17). Generations
      dropped; the note reads "From their last 100 games" when a player has
      more. Follows the API change that keeps `/career` within the free plan's
      CPU limit.
- [x] **P4: career stats** (2026-10-17). Five facts on the player page: now
      playing, biggest haul, on the brink, generations (from the API's new
      `/career` route) and most clipped (from the clip list). Weaker facts
      (library size, achievement total, peak year) dropped after mocking them
      with real data. Hidden histories leave the section out.

- [x] **P3: gamercard** (2026-10-17). The player card shows reputation, years
      on Xbox, location and bio from the richer profile; the clip page's reel
      card adds years on Xbox. Empty fields hidden. No extra upstream calls.

- [x] **Redesign: Broadcast in kingfisher** (2026-10-17, PLAN §12). Designed
      on a canvas with real data first, then built: kingfisher tokens and
      Barlow type; a most-played ticker on every page; the player page
      merged with the replay (latest clip plays, player card, up next, end
      of reel); clip, game and home pages restyled; phone layouts with the
      strap moved below the video. No new API requests on the player page;
      the clip page adds two cached ones (profile, clip list) for the reel
      card and up next.
      Trade-off: on desktop the strap overlays the picture and fades four
      seconds into playback (returns on pause); it ignores clicks so the
      video controls stay usable.

- [x] **Own copy and disclaimer** (2026-10-17). Home headline "Every gamertag
      has a highlight reel" with no lede; search placeholder "Gamertag"; new
      empty-shelf and game-page wording; meta description rewritten; footer
      disclaimer on every page. The Xbox Clips name and domain are kept
      deliberately, despite Microsoft's trademark guidelines on brand names
      (PLAN §3).

- [x] **P1: most-played games** (2026-10-17). Front-page panel (#1 as a
      hero, then 11 tiles) and an in-app game page at `/game/:productId`,
      seeded from the cached list. No store links: the aim is to keep
      visitors on the site. Ratings show only with 20+ ratings. Also added
      scroll restoration, so new pages open at the top; links low on a page
      used to open the next page part-way down. The home page's "Xbox game
      clips" subtitle is removed.

- [x] **Pages build uses Node 24** (2026-10-17). The build log shows it read
      `.node-version` and installed Node 24.13.1.

- [x] **`www.xboxclips.io` redirect** (2026-10-17). 301 to the apex,
      keeping path and query: a Bulk Redirect list and rule (preserve query
      string, subpath matching, preserve path suffix, include subdomains)
      plus a proxied `A www 192.0.2.1` placeholder record. Not a Pages
      custom domain.

- [x] **Q2: thumbnail as `og:image`** (2026-10-17). Previews show the
      thumbnail in WhatsApp and Discord despite the octet-stream type.
      Enough confidence to stop testing apps individually.

- [x] **Midnight Violet and a bolder UI** (2026-10-17). Chosen from six
      palettes screenshotted on the real app. Gradient headline; logo in
      the two colours, solid;
      buttons are a light violet outline on a soft tint (a gradient fill was
      too busy, and no text colour reads across it); ambient violet and cyan
      glow; profile banner with a gradient ring; clip cards that lift, glow
      and show a play badge on hover.
      View counts on cards, from the list data (no extra request). The
      header search hides on the home page, which has its own.

- [x] **Orange theme and autoplay** (2026-10-17). Accent changed to the old
      Xbox Live Gold orange. Clips autoplay: with sound after an in-site
      navigation, muted when the browser refuses sound (arriving from a
      shared link).

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

- [x] **Scaffold per PLAN §13** (2026-10-16). Search, player shelf, clip
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
