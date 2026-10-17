# UI Plan — v1

**Status:** live at `https://xboxclips.io`. Written 2026-10-16.
**Where this stands right now, and what to do next: §13. Proposed features: §11. Redesign: §12.**

This is the plan for `xbox-clips-ui`, the frontend of a social hub for
sharing Xbox game clips. It is the authoritative reference for the v1 UI:
what is being built, and why each choice was made. The backend is
`xbox-clips-api`, a Cloudflare Worker deployed at
`https://xbox-clips-api.xbox-clips-api.workers.dev`. Its contract is
summarised in §2, so this document can be read on its own.

---

## 1. Product shape

A visitor types a gamertag and sees that player's recent clips. Clicking
one opens a clip page that plays the video and offers a share link. **No
login, for anyone.**

v1 covers exactly two flows:

1. **Search and shelf.** Enter a gamertag, see the player's profile and a
   grid of their clips.
2. **Clip page.** Play one clip, and share a link to it. A shared link
   unfurls in chat apps with the clip's title and thumbnail.

The UI is served from **`https://xboxclips.io`**.

---

## 2. Backend contract

The API is called directly from the browser. It allows cross-origin
requests only from configured origins (§8, B3).

### Routes used

| Route | Returns |
| :--- | :--- |
| `GET /api/v1/players/:identifier` | `{ xuid, gamertag, gamerscore, gamerpicUrl }`. Gamertag or XUID. |
| `GET /api/v1/players/:identifier/clips?limit=` | `{ xuid, access, total, clips }`. `limit` defaults to 20, maximum 100. |
| `GET /api/v1/clips/:xuid/:clipId` | One clip, with a media URL valid for playback. |
| `GET /api/v1/clips/:xuid/:clipId/preview` | Clip metadata without a media URL or view count. Used only by the preview function (§7). |
| `GET /api/v1/games/most-played` | `{ games }`: the Xbox Store's most-played games, ranked. Cached by the API for 6 hours. |
| `GET /api/v1/games/:productId` | One game from that list, for the game page. |

### Clip shape

```ts
{
  clipId: string; xuid: string;
  gameTitle: string; caption: string; durationSeconds: number;
  recordedAt: string; publishedAt: string;
  thumbnailUrl: string | null;
  availableUntil: string;            // estimate: Xbox deletes clips ~90 days after upload
  views: number;
  media: { url: string; expiresAt: string } | null;
}
```

- **`media.url` is valid for about an hour** from when the API fetched
  it, and must not be used past `media.expiresAt`. Occasionally a URL
  stops working a few minutes early.
- **`media` can be `null`** when the API is serving cached data while
  Xbox is throttling it. The clip's details are still valid; it just
  cannot be played right now.
- **`access`** is `public` or `restricted`. `restricted` means the
  player's capture privacy hides their clips, which is different from
  having none.
- **Only the first page of a player's clips** is returned. There is no
  pagination in v1.

### Errors

Every failure is `{ "error": { "code", "message", "status" } }`. The
`message` is fixed, user-safe text per code, so the UI may display it as
is. Codes: `INVALID_IDENTIFIER` (400), `PLAYER_NOT_FOUND`,
`CLIP_NOT_FOUND`, `NOT_FOUND` (404), `CLIP_EXPIRED` (410),
`RATE_LIMITED`, `UPSTREAM_RATE_LIMIT` (429, with `Retry-After`),
`UPSTREAM_ERROR` (502), `INTERNAL_ERROR` (500).

### The shared budget

Every visitor shares one upstream budget of 150 requests per hour. The
API caches aggressively, but **the UI must not make avoidable calls**:
no polling, no prefetching clips the visitor has not opened, no retries
on 4xx, and client-side validation before any lookup.

---

## 3. Decisions

These are the non-obvious choices, recorded with their reasoning so they
are not quietly undone later.

**Hosting: Cloudflare Pages, with Git integration.** The frontend has its
own deployment style, distinct from the backend's Worker, which keeps the
two sides clearly separate. Git integration gives every branch and every
pull request its own preview deployment automatically. Cloudflare does
not allow a project to switch between Git integration and Direct Upload
later, in either direction, so this is chosen deliberately at project
creation.

**Domain: `xboxclips.io`, at the apex.** Pages serves an apex domain only
when the domain is a zone on the same Cloudflare account. `xboxclips.io`
is registered with Cloudflare and is already a zone on the account, so
no DNS move is needed. `www.xboxclips.io` redirects to the apex.

**React, Vite and TypeScript (strict).** Vite produces a plain static
build that Pages serves directly. TypeScript matches the backend and
types the API contract in §2.

**React Router, as a client-side router only.** v1 is a single-page app.
Pages serves the root page for any path that is not a static file,
provided the build has no top-level `404.html`, so client-side routes
work on direct visits and reloads.

**TanStack Query for API data.** It caches responses across navigation,
so going from a shelf to a clip and back does not spend another API
call, and it removes duplicate in-flight requests. It is configured to
match the shared budget: no automatic retries at all, no refetch on
window focus or reconnect, and a clip's cached data is considered stale
5 minutes before its `media.expiresAt`. Retries are off even for server
errors, because a retry is a request the visitor did not ask for.

**The shelf requests the profile first, then clips by XUID.** Requesting
both by gamertag in parallel would make the API resolve the same
gamertag twice on a first visit, spending an extra upstream search.

**Opening a clip from a shelf reuses the shelf's data.** The clip page is
seeded from the cached list, so it costs no request while the clip's
media URL is still fresh.

**CSS Modules for styling; a component library is optional and
deferred.** CSS Modules are built into Vite and need no dependency. The
choice of component library, if any, is Q4 (§9).

**The look: Broadcast, in kingfisher colours** (chosen 2026-10-17; §12).
Generic clip sites share one layout, a profile header over a grid of
thumbnails, and this site set out to look like none of them. Four
directions were drawn on a design canvas (an editing-suite reel, trading
cards, sports broadcast, arcade attract mode). Broadcast was taken
forward and modelled on every page with real data before any code
changed. It presents clips the way sports TV presents a replay:

- a **most-played ticker** across the top of every page;
- the clip as a **REPLAY**, with a **name strap**: the game name on an
  orange bar, the gamertag and date on a dark bar beneath;
- a **player card** of stats, and **UP NEXT** instead of a grid.

**Kingfisher palette:** deep teal-navy ground (`#06192b`), blue-teal
panels and rules (`#0b2a40`, `#18405c`), kingfisher orange (`#f5862b`)
for straps, rank chips and primary buttons, with dark text on it (7:1),
and kingfisher blue (`#0b6aa3`) for REPLAY and other badges, with white
text (5.8:1). An earlier navy-and-yellow version and a violet palette
were both considered; kingfisher keeps to two hues. **Type:** Barlow
Condensed (800, often italic) for straps, headings and the logo; Barlow
for text. The primary button reads **GO**.

**The design is built for real data, not flattering samples.** Modelled
on a real player, it showed captions are almost always empty, view
counts are near zero and reels can be two clips long. So straps lead
with the game name, a caption shows only when one exists, views appear
only when above zero, stats are ones that read well at small numbers
(gamerscore, clip count, last clip, reel length), and a short reel ends
with a deliberate "END OF REEL" rather than an empty grid. The 90-day
deletion is shown as information: a clip about to leave Xbox says so.

**A share link is the clip page's own URL.**
`https://xboxclips.io/clip/:xuid/:clipId` is both what people share and
what they land on: no separate share route, no redirect. It carries both
identifiers because the backend keeps no stored state: there is no table
mapping a short code to a clip, and a clip can only be fetched through
its owner's list.

**Per-clip link previews come from a Pages Function on `/clip/*` only.**
Chat-app crawlers read preview tags from the raw HTML and do not run
JavaScript, so a plain single-page app would unfurl every link
identically. The function adds the clip's tags to the page (§7).
Everything else is served as static files, with no function invocation.

**The preview function never breaks the page.** Any failure to get
metadata, including a timeout, serves the page unchanged with the site's
generic tags. A missing preview is acceptable; a broken clip page is
not.

**Playback is a plain `<video>` element** pointed at the upstream media
URL, so the browser streams straight from the Xbox CDN.

**Our own voice, and an honest relationship with Microsoft's brand.** The
copy is written for this site, not borrowed: the home page has a single
headline, "Every gamertag has a highlight reel", with no lede; the search
box is labelled "Gamertag"; an empty shelf says "Nothing captured yet.
Check back after their next session." Every page carries a footer: "Not
affiliated with or endorsed by Microsoft. Xbox is a trademark of the
Microsoft group of companies." The name stays Xbox Clips on the
`xboxclips.io` domain by deliberate choice. Microsoft's trademark
guidelines ask third parties not to use its brands in product or domain
names, so this is a known risk, accepted for now; the disclaimer and
descriptive use elsewhere keep any implied endorsement out of the copy.

**No visitor state in v1.** Recent gamertags and favourites are out of
scope (§10).

---

## 4. Routes

| Path | Page |
| :--- | :--- |
| `/` | Search: a gamertag box. |
| `/player/:identifier` | Shelf: profile header and clip grid. Gamertag or XUID. |
| `/clip/:xuid/:clipId` | Clip page: player, details, share. Also the share link. |
| `/game/:productId` | Game page: store art and details for a most-played game (§11, P1). |
| anything else | Client-side not-found page. |

**Validation mirrors the backend's**, so malformed input never costs an
API call: an all-digit identifier is an XUID (up to 20 digits); a
gamertag is letters, digits and inner spaces, up to 15 characters, with
an optional `#1234` suffix; a clip id is a UUID.

The shelf requests `limit=100`, so it shows the whole first page.

---

## 5. Playback

- `<video controls playsinline preload="metadata">` with the clip's
  thumbnail as the poster.
- **The clip plays automatically when the page opens.** Browsers allow
  sound only after the visitor has interacted with the site. Arriving
  from a shelf counts, so the clip plays with sound. Arriving cold from a
  shared link, the unmuted attempt is refused with `NotAllowedError`, so
  the player mutes and plays; one tap on the speaker restores sound.
  Muted autoplay is always allowed (MDN, "Autoplay guide for media and
  Web Audio APIs").
- **On a playback error, the page fetches the clip route once more** and
  retries with the new URL. This is required, not an optimisation: URLs
  expire hourly, and some die a few minutes before their stated expiry.
  A second failure shows an error with a manual retry button.
- **`media: null`** shows the thumbnail with "temporarily unavailable"
  and a manual retry button. No automatic retry.
- Errors from the API display the envelope's `message`. `CLIP_EXPIRED`
  and `restricted` access get no dedicated design in v1 (§10).

---

## 6. Sharing

Two icon buttons side by side, labelled for screen readers and with
tooltips:

- **Copy** puts `https://xboxclips.io/clip/:xuid/:clipId` on the
  clipboard; the icon turns into a tick briefly to confirm.
- **Share** opens the device's share sheet (`navigator.share`). It
  appears only where the browser supports it, which covers most phones,
  so desktop visitors usually see the copy icon alone.

---

## 7. Link previews

A Pages Function at `functions/clip/[xuid]/[clipId].ts` handles every
request to `/clip/*`:

```
crawler or person → xboxclips.io/clip/<xuid>/<clipId>
  1. get the root page from the static build (ASSETS)
  2. validate both params; invalid → serve the page unchanged
  3. fetch preview metadata from the API over a service binding, with a short timeout
  4. rewrite <head>: <title>, og:title, og:description, og:image, og:url, twitter:card
  5. return the HTML
       crawler → reads the tags
       person  → React boots and fetches the playable clip as usual
```

- **Service binding.** The function reaches the API Worker through a
  service binding named `API`, declared in `wrangler.jsonc`, rather than
  over the public internet. Cloudflare documents `fetch` over a Pages
  service binding; the function uses that.
- **Metadata only.** The preview endpoint returns cached clip metadata
  and never fetches a media URL, so a link pasted into a busy chat costs
  at most one upstream call, the first time that clip is previewed.
- **Tags.** `og:type` is `video.other`; `og:image` is the clip's
  thumbnail; titles use the caption, else "`<game>` clip". Values are set
  through `HTMLRewriter`, which escapes them.
- **The base HTML carries generic site tags**, so a non-clip link, or a
  clip whose metadata could not be fetched, still unfurls with the site
  name and description.
- **Caching.** The HTML is not given a long cache lifetime: it
  references hashed asset files, and a stale copy after a deploy would
  point at assets that no longer exist.

---

## 8. Backend changes this depends on

Made in `xbox-clips-api` and recorded in its own plan. All four are
done.

- **B1 — Preview endpoint. Done.** Add `GET /api/v1/clips/:xuid/:clipId/preview`,
  returning clip metadata from the cache first, as the current `/share`
  route already does internally.
- **B2 — Remove `/share`. Done.** The clip page's own URL replaces it, so the
  Worker's share route and its HTML rendering go.
- **B3 — Allowed origins. Done.** `https://xboxclips.io`, `http://localhost:5173`
  for development, and the project's preview deployments at
  `https://*.xbox-clips-ui.pages.dev`. Preview hostnames change per
  branch and per commit, so this needs a suffix match rather than a
  fixed list. Only this Pages project can serve hostnames under that
  suffix. `UI_ORIGIN` is removed, since nothing redirects to the UI any
  more.
- **B4 — Rate limiting over the service binding.** The API limits each
  client IP. Requests from the preview function arrive over the service
  binding, not from the visitor, so every crawler could share one
  bucket. The function forwards the visitor's IP, and the API was
  confirmed to receive it (§9, Q1). **Done; no API change needed.**

An API custom domain such as `api.xboxclips.io` becomes possible once the
zone is on Cloudflare. It is not needed for v1.

---

## 9. Open questions

- **Q1 — Client IP over a service binding. Answered 2026-10-17:** the
  API receives the visitor's own IP as `CF-Connecting-IP` on a preview
  request, so its per-IP limit counts the visitor, not the function. The
  value is trustworthy: Cloudflare sets that header on requests from the
  internet, and over the binding only the function can set it. B4 needs
  no API change.
- **Q2 — Thumbnail as `og:image`. Settled 2026-10-17:** Xbox serves
  thumbnails as `application/octet-stream`, not `image/png`, but WhatsApp
  and Discord both show the thumbnail in clip link previews. That is
  enough confidence; other apps are not being tested individually.
- **Q3 — Base HTML in the function. Settled by design:** the function
  fetches `/` from its `ASSETS` binding explicitly, so it does not depend
  on how the single-page-app fallback resolves `/clip/*`.
- **Q4 — Component library.** The palette and treatment are settled
  (§3). Whether a component library is worth adding is still open; the
  UI is built with CSS Modules alone so far.

---

## 10. Deliberately out of scope for v1

- **Recent gamertags and favourites.** Device-only state; the obvious
  next feature.
- **Dedicated expired and restricted states.** v1 shows the API's
  message. A designed state for `CLIP_EXPIRED` and `restricted` access
  comes later.
- **`availableUntil` display.** The data is there; showing it is later.
  (View counts are shown on clip cards and the clip page; they come with
  the clip list, at no extra request.)
- **Pagination** beyond the first page of clips.
- **Short share links.** Possible without stored state by packing both
  identifiers into one code; not needed yet.
- **Logs and analytics.** To be handled separately.
- **Screenshots, accounts, any database.**

---

## 11. Proposed features

Candidates for after v1, not commitments. Every upstream endpoint named
here was confirmed in the live OpenXBL spec on 2026-10-17. None of their
response shapes are documented, so each feature starts with one real
payload, inspected the way the clip payload was, before any code.

Each one is sized against the shared budget of 150 upstream requests per
hour, which is the constraint that decides whether a feature is viable.

### P1 — Front page: popular games (built 2026-10-17)

The front page gains a dashboard of what is being played right now,
below the search box.

- **Source:** `GET /v2/marketplace/most-played`. Sibling lists exist for
  new, top-free, best-rated and coming-soon games, if more shelves are
  wanted.
- **Budget:** negligible. The list is the same for every visitor, so the
  API caches it once (for hours) and serves it to everyone. Traffic does
  not change the cost: one upstream call per cache window.
- **Backend:** a new route, `GET /api/v1/games/most-played`, with a
  transformer written against the real payload.
- **Limit to know about:** there is no endpoint for clips by game across
  players, so a game tile cannot open "clips of this game". It can show
  the game, and link to its store page.

**Payload findings** (one real response, 2026-10-17):

- `content.channels.MOST_PLAYED_.products` is the ranking: 25 product IDs
  per page, out of `totalItems` 17,744. `content.productSummaries` holds
  the 25 games in the same order.
- Each summary carries `title`, `categories` (genres such as "Shooter",
  "Action & adventure"), `developerName`, `publisherName`, `releaseDate`,
  `averageRating`, `ratingCount`, `availableOn`, and four images in
  `images`: `boxArt` (square), `poster` (2:3), `superHeroArt` (16:9) and
  `featurePromotionalSquareArt`. All 25 had every image.
- **Duplicates.** Editions and platform versions are separate products:
  GTA VI appeared three times and GTA V twice. The Xbox title ID
  (`xCloudProperties.xboxTitleId`) cannot be used to merge them: only 9 of
  25 games carry one, and three different Call of Duty games share one ID.
  Only identical titles are merged, keeping the best rank.
- **Images resize by query string.** `?w=640` on a store image URL cut a
  16:9 hero image from 2.3 MB to 63 KB. The originals are up to 3840 px wide
  and must not be used as is.
- **Store links.** `https://www.xbox.com/games/store/_/<productId>`
  redirects to the visitor's own regional store.
- **Prices are omitted:** they arrive in a single currency (EUR here)
  regardless of the visitor's country. **Game Pass badges are omitted:**
  passes are listed only by internal product IDs.

**As built:**

- **API:** `GET /api/v1/games/most-played` returns the first page trimmed
  to about 10 KB: per game, rank, title, genres, developer, release date,
  rating, platforms, a resized hero image and box art, and the store link.
  Cached as `games:most-played`: fresh for 6 hours, kept for 7 days for
  stale serving. At most 4 upstream calls a day, regardless of traffic.
- **UI:** a "Most played on Xbox" panel below the home-page search: the #1
  game as a wide hero tile (16:9 art, rank badge, title, genres), then the
  next 11 as box-art tiles with rank, title and main genre. The panel is
  hidden if the list cannot load.
- **Tiles open an in-app game page, not the store.** Keeping visitors on
  the site was the aim, and clips by game do not exist upstream, so
  `/game/:productId` shows the store hero art, rank, genres, developer,
  release year, platforms, rating and description, with a player search
  as the call to action. It is seeded from the cached list, so opening it
  from the front page costs no request. A rating is shown only with at
  least 20 ratings behind it; an average from a handful misleads.
- **Images** are always requested at a size (`?w=` with a `srcset`), never
  the originals.
- **Known limits:** differently named editions still appear separately
  (by design: only identical titles merge). Some store descriptions are
  promotional text rather than a description of the game; they are shown
  as the store provides them. If a by-game clip listing ever becomes
  available upstream, the game page is where popular clips would go.

### P2 — Achievement face-off

Enter two gamertags and compare them: gamerscore head to head, the games
they share, and achievement progress in each shared game. A face-off has
its own shareable URL, e.g. `/compare/:a/:b`, with a link preview like a
clip's.

- **Sources:** profiles (already used), title history per player
  (`GET /v2/titles/{xuid}`) to find shared games, and per-game
  achievements (`GET /v2/achievements/player/{xuid}/{titleId}`).
- **Budget:** the expensive feature. A first face-off costs about 4–6
  calls (2 profiles, 2 title histories, plus searches for uncached
  gamertags), and each shared game opened costs 2 more. Caching title
  history per player for hours brings repeats close to free. Microsoft's
  achievements service is generously limited (100 per 15 s burst), so the
  OpenXBL hourly budget is what binds.
- **Backend:** routes for a player's title history and per-game
  achievements, each cached per player.
- **To decide:** whether per-game detail loads on demand (cheaper) or up
  front (nicer), and how many shared games a face-off shows.

### P3 — Gamercard on the clip page

"More from this player" becomes a gamercard: gamerpic, gamertag,
gamerscore and a link to the shelf, styled like the old Xbox gamercard.
The shelf's profile header can become the same card.

- **Source:** the profile call the API already makes. It returns more
  than the API currently passes on: bio, location, tenure, reputation,
  account tier and preferred colour. Exposing those costs no extra
  upstream calls.
- **Budget:** on the clip page, one profile request by XUID, cached by the
  API for 2 hours. Online status would need the presence endpoint, a
  separate call to Xbox's most strictly limited service, so it is left
  out unless wanted.
- **Backend:** extend the profile response with the extra fields.

### P4 — Profile trivia

A "player stats" panel on the shelf: fun facts about how someone plays,
drawn from data the API can reach for any public player. Candidates,
each with its source:

| Fact | Source | Confidence |
| :--- | :--- | :--- |
| **Most clipped game** | The clip list already fetched for the shelf | Free; no extra call |
| **Most played and recently played games** | Title history, `GET /v2/titles/{xuid}` | Endpoint confirmed; whether it carries playtime for other players, as it does for the key owner, is unknown |
| **Completion stats**: overall completion, games at 100%, the game closest to completion | Title history with achievement progress, `GET /v2/achievements/player/{xuid}` | Confirmed: documented as per-game achievement progress |
| **Favourite genres** | Each played game's catalog entry, `GET /v2/marketplace/title/{titleId}` | Endpoint confirmed; genre fields in the catalog payload to be checked |
| **Achievement timeline**: first ever achievement, busiest day, most active hour or weekday ("night owl"), longest unlock streak | Every achievement with its unlock time, `GET /v3/achievements/player/{xuid}` | Confirmed: unlock timestamps are documented |
| **Rarest achievement** | The same v3 records, if they carry rarity | Unknown; check the payload |
| **Playtime per game** | `POST /v2/player/stats` with per-title stat names | Unknown: accepts any XUIDs, but which stat names work, and for whom, needs testing |
| **Platform history**: Xbox 360 vs One vs Series | Title history | To check in the payload |

- **Budget:** trivia does not need to be fresh, so the API computes a
  player's facts once and caches them for about a day. Facts derived from
  data already on hand cost nothing. A full set costs a handful of calls
  on first view: title history and achievement progress are one call
  each, while the achievement timeline is paginated and genres need one
  catalog lookup per game. So the API caps both, for example the 100
  most recent achievements and the 10 most played games. Catalog entries
  are the same for every player, so they are cached globally and the
  cost falls as more players are viewed.
- **Backend:** one route, e.g. `GET /api/v1/players/:identifier/trivia`,
  that fetches, derives and caches the facts, so the UI makes a single
  request. Each fact is optional: anything a payload turns out not to
  support is simply left out.
- **First step:** one sample payload from each source, to settle the
  "unknown" rows before choosing which facts to build.

### P5 — Installable app (PWA)

The site can be installed to a phone's home screen or a desktop's app
list, opening in its own window without browser chrome, like a native
app.

- **What installability needs** (MDN, "Making PWAs installable"): HTTPS,
  which the site already has, and a web app manifest with a name, a
  `start_url`, a `display` mode such as `standalone`, and icons at 192
  and 512 pixels. **A service worker is not required** to be installable.
- **Where it works:** Chromium browsers on desktop and Android offer
  install from the manifest. iOS 16.4 and later installs from the Share
  menu in Safari, Chrome, Edge and Firefox, but does not support a custom
  in-page install button. Safari on macOS adds any site to the Dock.
  Firefox does not install from a manifest.
- **Offline: deliberately minimal.** The site's content is streamed
  video and live data, so there is little to offer offline. If a service
  worker is added, it caches only the app's own static files and an
  offline notice, and **never caches API responses**: those carry media
  URLs that expire within the hour, and must stay subject to the
  budget-safe fetch rules in §3. It also never fetches anything ahead of
  the visitor.
- **Budget:** none. A manifest and icons are static files.
- **Work:** a manifest, an icon set (and an Apple touch icon for iOS),
  and the matching tags in `index.html`. The icons need the site's visual
  identity, so this follows the palette decision (Q4).
- **Later options:** the installed app could register as a share target,
  so sharing a clip link from another app opens it here (Web Share Target,
  Chromium only).

---

## 12. Redesign: Broadcast in kingfisher

The design in §3, as modelled on the design canvas (desktop and phone, with
real data). Built in this order; each step leaves the site working.

1. **Theme.** Replace the colour and type tokens with the kingfisher
   palette and Barlow / Barlow Condensed (Google Fonts). Primary buttons
   become solid orange with dark text ("GO"); secondary buttons an orange
   outline. Drop the gradient flourishes and ambient glow. The logo
   becomes "XBOX**CLIPS**" in condensed italic, "CLIPS" in orange. Set
   `theme-color` for mobile browser chrome.
2. **Ticker and header.** A most-played band on every page: an orange
   "MOST PLAYED" label ("TOP" on phones), then ranks and titles, each
   linking to its game page. It reads the cached ranking the front page
   already uses, so it costs no extra request once loaded. Static, not
   animated; it scrolls sideways if it overflows. If the ranking cannot
   load, the band is left out.
3. **Home.** A condensed headline, "EVERY GAMERTAG HAS A **HIGHLIGHT
   REEL**", and the search with GO. Most played: the #1 game as a feature
   with a "NO. 1 THIS WEEK" badge and name strap, then ranks 2–12 as box
   art with orange rank chips (a grid on desktop, a sideways-scrolling
   row on phones).
4. **Player page.** The player's latest clip plays at the top as the
   replay, with REPLAY and duration badges and the name strap. Beside it
   (below on phones) the player card: gamerpic, gamertag, and four stats
   (gamerscore, clips, last clip as "N days ago", reel length as total
   duration). If a clip leaves Xbox within 30 days, a notice says which and
   when. "COPY REPLAY LINK" and share act on the replay. UP NEXT lists the
   other clips; a reel ends with "END OF REEL · THAT'S ALL N CLIPS". No new
   requests: the profile and clip list are already fetched.
5. **Clip page** (the share link). The same replay and strap, a line with
   duration and "On Xbox until about <date>", COPY LINK (solid) and share,
   a "FROM THE REEL OF" card (gamerpic, gamertag, gamerscore, clip count)
   with WATCH THE FULL REEL, and UP NEXT. This adds the player's profile
   and clip list to the page: two cached API requests, the list usually
   already fresh because resolving the clip fetched it.
6. **Game page.** The banner with "NO. 1 · MOST PLAYED ON XBOX" badges and
   the name strap, a stats bar (released, rating, genre, plays on), the
   description, the find-clips panel, and ALSO MOST PLAYED (the next
   ranks, excluding this game).
7. **Phones.** Below 720 px: the replay and banners run edge to edge; the
   name strap moves below the video, overlapping its bottom edge, so it
   never covers the clip; stats become a 2×2 grid; UP NEXT a list; most-
   played rows scroll sideways; the header search shrinks to a compact box.
8. **Docs and checks.** README, CLAUDE.md and TODO updated; tests cover the
   ticker, the stats, the expiry notice, views hidden at zero, and the
   merged player page.

## 13. Current status

Updated 2026-10-17.

**Redesigned** in the Broadcast look, in kingfisher colours (§3, §12), on
desktop and phone. 56 tests run without touching the API.

**Live at `https://xboxclips.io`**, deployed through Pages' Git
integration (also reachable at `https://xbox-clips-ui.pages.dev`). On the
live site, a clip page served to a crawler carries that clip's own
preview tags, fetched from the API over the service binding, with
`og:url` on `xboxclips.io`. `www.xboxclips.io` redirects to the apex with a 301 that keeps the path
and query: a Bulk Redirect plus a proxied placeholder `A` record for
`www`, per Cloudflare's "Redirecting www to domain apex" guide. `www` is
not a custom domain on the Pages project. Every route in §4,
playback with its retry (§5), sharing (§6) and the preview function (§7)
are built. App tests run in a simulated browser and function tests in
the Workers runtime. The production
build and the function bundle both build, and a local Pages run confirmed
routing and the function's fallback path. The backend serves every route
in §2 and already allows this project's origins (§8). `TODO.md` is the
working backlog; `CLAUDE.md` is the map of the code.

### Settled

- Cloudflare Pages with Git integration, on `xboxclips.io` (§3).
- React, Vite, TypeScript, React Router, TanStack Query, CSS Modules (§3).
  A component library is optional and deferred (Q4).
- `xboxclips.io` is already a Cloudflare zone on the account (§3).
- v1 scope: search and shelf; clip page with playback and sharing (§1).
- The share link is the clip page URL, with previews from a Pages
  Function on `/clip/*` (§3, §7).
- The Broadcast look in kingfisher colours, with the player page merged
  with the replay (§3, §12).

### Next steps, in order

1. Choose the next proposed feature (§11). P5 (installable app) is
   unblocked now that the visual identity is settled.
