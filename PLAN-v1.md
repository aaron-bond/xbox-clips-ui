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
| `GET /api/v1/players/:identifier/mythics` | `{ xuid, mythics }`: the player's Mythic total, null when the history is hidden. Cached by the API for 24 hours; a first read can take about 30 seconds. |
| `GET /api/v1/players/:identifier/nearest-completion` | `{ xuid, games, mythics, capped }`: the 100 started, unfinished games nearest to complete and up to 100 Mythic or fully earned games, from the whole history; `capped` when it reached the 1,000 games Xbox lists. Not cached by the API: one upstream call per request, up to about 30 seconds. |
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
  player's clips aren't public (Xbox says so explicitly; settled
  2026-10-20), and the player page says "This player's clips aren't
  public." A player with nothing to show is `public` with no clips:
  "Nothing captured yet…".
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
window focus or reconnect. Player data (profile, clips, career, games,
achievements) is reused for 5 minutes, and a clip's data goes stale
sooner if its `media.expiresAt` is less than 5 minutes further off. The
window is short because the API's own cache is what protects the upstream
budget; together, a new clip or achievement shows within about 20 minutes
(15 at the API, 5 here). Retries are off even for server errors, because a
retry is a request the visitor did not ask for.

**The shelf requests the profile first, then clips by XUID.** Requesting
both by gamertag in parallel would make the API resolve the same
gamertag twice on a first visit, spending an extra upstream search.

**Opening a clip from a shelf reuses the shelf's data.** The clip page is
seeded from the cached list, so it costs no request while the clip's
media URL is still fresh.

**CSS Modules for styling, and no component library.** CSS Modules are
built into Vite and need no dependency. A library was considered and
dismissed (Q4, §9).

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
(gamerscore, clip count, last clip, reel length), and a one-clip reel
has no "Up next" section rather than an empty one. The 90-day
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

**Visitor state lives on the device only.** Pinned and recent players
(§12, step 11) are kept in the browser's local storage and never sent to
the API; there are no accounts.

---

## 4. Routes

| Path | Page |
| :--- | :--- |
| `/` | Search: a gamertag box. |
| `/player/:identifier` | Player page: the replay, player card, Up next and career stats (§12). Gamertag or XUID. |
| `/player/:identifier/clips` | The player's whole reel on its own page, from Up next's "See all" tile. |
| `/player/:identifier/achievements` | The player's recent games (up to 100), each leading to its achievements. From the player card's Achievements tile. |
| `/player/:identifier/achievements/:titleId` | The player's achievements in one game. From a recent game, or a career stats card. |
| `/clip/:xuid/:clipId` | Clip page: player, details, share. Also the share link. |
| `/game/:productId` | Game page: store art and details for a most-played game (§11, P1). |
| anything else | Client-side not-found page. |

**Validation mirrors the backend's**, so malformed input never costs an
API call: an all-digit identifier is an XUID (up to 20 digits); a
gamertag is letters, digits and inner spaces, up to 15 characters, with
an optional `#1234` suffix; a clip id is a UUID.

The player page requests `limit=100`, so it has the whole first page; the
reel page reads the same cached list and costs no request when reached
from the player page.

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
- **Q4 — Component library. Dismissed 2026-10-18.** The look is settled
  (§3) and built with CSS Modules alone; there is no reason to revisit it.

---

## 10. Deliberately out of scope for v1

- **Recent gamertags and favourites.** Device-only state. Now planned as
  pinned and recent gamertags (§13).
- **Dedicated expired and empty states.** v1 shows the API's message. A
  designed state for `CLIP_EXPIRED` and for empty and private reels comes
  later.
- **`availableUntil` display.** The data is there; showing it is later.
  (View counts are shown on clip cards and the clip page; they come with
  the clip list, at no extra request.)
- **Pagination** beyond the first page of clips.
- **Short share links.** Possible without stored state by packing both
  identifiers into one code; not needed yet.
- **Analytics.** Error reporting was planned in §14 and dropped; page
  views and analytics stay out of scope.
- **Screenshots, accounts, any database.**
- **Locking the API to this site.** No longer out of scope: brought
  forward 2026-11-05. The design, the checks and the phased rollout are
  in the API's PLAN §6. The UI's part: a Pages Function,
  `functions/api/[[path]].ts`, serves `xboxclips.io/api/*` by forwarding
  to the API Worker over the existing `API` service binding (the one
  link previews use; the API still sees the visitor's IP), letting a
  request through only if it is same-origin (`Sec-Fetch-Site`, or the
  `Referer` for older browsers); report-only at first, then `403`.
  The app calls `/api/...` on its own origin (`VITE_API_BASE_URL` is
  gone), and the Vite dev server forwards `/api`
  to `https://xboxclips.io` for local development.

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

Priority order (§13): first a single player's achievements in a game,
then a second player added for comparison.

**Built 2026-10-18: one player.** The player card's Achievements tile
opens `/player/:identifier/achievements`: the player's recent games (from
the same cached title history as career stats) as box-art tiles with
gamerscore progress, unlocked count and when last played, Xbox 360 games
badged. Each opens `/player/:identifier/achievements/:titleId`, as does
each career stats card: a banner with box art and name strap, a stats bar
(gamerscore earned and total, unlocked count, rarest unlock), tabs (All,
Unlocked, In progress, Locked), and a row per achievement with its 16:9
art (greyed while locked), description, rarity, gamerscore and either its
unlock date or a progress bar. The stats bar also shows **time played**
in the game ("33 h 39 m"), left out when Xbox reports none, as for Xbox
360 games. While the data loads, both pages show a spinner with a line of
text ("Loading their games…"), and game art and achievement images shimmer
until each has loaded (a fade under reduced motion). Newest unlocks come first, then those
furthest along. Secret achievements show as "Secret achievement · Tap to
reveal" until unlocked. Xbox 360 games list only unlocked achievements,
without art (the game's art stands in), and say so. Cost: the games list
costs nothing extra; each player's achievements in a game is one call per
hour while viewed. **Still to build:** the second player.

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

### P3 — Gamercard (built 2026-10-17)

Delivered as the player card of the redesign (§12) plus richer profiles.
The card shows the gamerpic, gamertag and stats, and now Xbox's reputation
tier as a tag (Good player, Needs work, Avoid me), years on Xbox, location
and the player's bio. The clip page's "From the reel of" card adds years on
Xbox. Empty fields are left out; bio and location are empty for many
players.

- **Source:** the profile call the API already made. No extra upstream
  calls; the API's profile cache key was versioned so older cached
  profiles are not served without the new fields.
- **Years on Xbox** comes from the profile's `TenureLevel`, which Xbox does
  not document. Real values fit years of membership (xbox-clips-api PLAN
  §2); if that proves wrong, only the label changes.
- **Left out:** online status (a separate call to Xbox's most strictly
  limited service), account tier (names a subscription that no longer
  exists under that name), and the preferred colour (a link to a colour
  file, for a design idea that was not taken up).

### P4 — Profile trivia (built 2026-10-17)

**As built:** a "Career stats" section on the player page, **below Up
next**, with four facts: **Now playing**, **Biggest
haul** and **On the brink** from the player's **last 100 games**, and
**Most clipped** from the clip list. When the player has more than 100
games, the section says "From their last 100 games". The facts are drawn
from recent games only because parsing a heavy player's whole history
exceeded the Workers free plan's CPU limit in production (13 ms against
10 ms); reading the newest 100 parses about a tenth of it. A
**Generations** fact (games per platform) was built and then dropped: it
needs the whole history, and recent games can't stand in for it.

**Loaded on scroll.** The section is the slowest thing on the page: a heavy
player's history can take several seconds upstream on the first visit of
the day. Measured on the live site, it never delayed the replay (clips
arrived about four seconds before it), but arriving late and pushing Up next
down made the page feel slow. So it sits below Up next, holds its place with
a same-sized placeholder, and is only requested once the section starts to
come into view. A visitor who watches the replay and leaves never spends the
title-history call, and never risks its CPU cost. It was
modelled on the design canvas first with real data. Library size, total
achievements and peak year were drawn too, then dropped as the weaker
facts: library reads "1,000+" for any heavy player, peak year needs a
"last played" caveat, and the achievement total is dry. The API route is
`GET /api/v1/players/:identifier/career`; the section is left out when the
history is hidden or fails to load. On a player's first visit of the day,
the facts arrive several seconds after the rest of the page, while the API
downloads the history.

A "career stats" panel on the player page: facts about how someone plays.
Each source was sampled once on 2026-10-17 (a well-known public player),
so the table records what the data actually holds.

| Source | Calls | What it holds | Verdict |
| :--- | :--- | :--- | :--- |
| Clip list (already loaded) | 0 | Games clipped, dates | **Usable** |
| Title history, `GET /v2/titles/{xuid}` | 1 | Up to **1,000 games**, each with gamerscore earned and available, completion %, last played, platforms; plus totals of achievements and "mythics" unlocked | **Usable.** Capped at 1,000 games (the sample's 1,000 covered 97,614 of 145,766 gamerscore), so facts read "of their last 1,000 games" for heavy players. About 1 MB raw: the API keeps only the derived facts |
| Per-game progress, `GET /v2/achievements/player/{xuid}` | 1 | The same data as title history | Redundant |
| Achievement records, `GET /v3/achievements/player/{xuid}` | 1 per 100 | Every achievement, locked or not, unordered; unlock times; **no rarity** | **Not viable:** the sample player has 24,731 records, about 250 calls to read; rarity facts are impossible |
| Player stats, `POST /v2/player/stats` | 1 | `MinutesPlayed`, per game. An early test returned no value; it works, and the achievements page uses it (P2) | **Usable** per game |
| Catalog, `GET /v2/marketplace/title/{titleId}` | 1 per game | `Category` / `Categories` (e.g. "Shooter") | **Usable but costly:** one call per game; cacheable for all players, since genres don't change |

**Candidate facts** (from title history unless noted; sample values in
brackets):

- **Now playing:** the most recently played game [Assassin's Creed Black
  Flag Resynced, 6 days ago].
- **Library:** games played [1,000+].
- **Biggest haul:** the game with the most gamerscore earned [Titanfall,
  1,260 of 2,000].
- **Completed:** games at 100% [5], and **on the brink**: the nearest to
  100% [Hellblade: Senua's Sacrifice, 90%].
- **Generations:** consoles played on [Xbox 360, Xbox One, Xbox Series
  X|S, PC].
- **Peak year:** the year in which most of their games were last played
  [2018, 135 games]. Labelled carefully: it is last-played, not
  first-played.
- **Achievements unlocked** [7,372].
- **Most clipped game** (clip list, free).
- **Favourite genre** (optional): from the top five games' catalog
  entries, up to five calls the first time, cached for everyone.

**Budget:** one title-history call per player, cached for a day; the
facts are computed in the API and only they are stored. Genre adds up to
five calls per player at first, falling as titles are cached.

**Left out:** an achievement timeline and rarity (above); Mythics, since
planned separately (P7); Game Pass share,
since the per-game flag's meaning is unclear.

### P5 — Installable app (PWA) (built 2026-10-18)

**As built:** `public/manifest.webmanifest` (name "Xbox Clips", start URL
`/`, standalone display, navy theme and background `#06192b`) and icons in
`public/icons/`: 192 and 512 px, a 512 px maskable version with the mark
inside the safe zone, a 180 px Apple touch icon and a 32 px favicon, all
linked from `index.html`. The icon is an **XC** monogram in the wordmark's
type, Barlow Condensed italic 800, white X and orange C on navy; the PNGs
were rendered from that font, so changing the mark means rendering them
again. No service worker. Chromium's own installability check reports no
errors against the production build. In the installed window there is no
browser back button; Android's system back works, and every page links
home through the logo.

**Install prompt:** a "Get the app" banner on the home page, under the
search. Where the browser offers installation (Chromium: Android, desktop
Chrome and Edge), the site catches `beforeinstallprompt` and its Install
button opens the browser's own dialog. On iPhone and iPad, which have no
such event, the banner gives the steps instead, with the Share icon drawn
inline so it can't be mistaken for the site's own share button: "Tap ⬆
Share in the browser toolbar, then Add to Home Screen". Nothing is shown inside the installed app or in browsers that
can't install (Firefox, desktop Safari). Dismissed, the banner stays away
for 30 days on that device; an "Install the app" link in every page's
footer remains.

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
- **Opening xboxclips.io links in the app** (checked 2026-11-03): only
  an install from Chrome on Android does this, because Chrome turns it
  into a WebAPK that claims links within the manifest's scope (`/`).
  Confirmed on a real phone. Installed from Firefox, it doesn't happen,
  and iOS has no way to do it. Making it work in every Android browser
  would mean a Trusted Web Activity in the Play Store (Bubblewrap, a $25
  developer account); considered and declined.
- **Offline: deliberately minimal.** The site's content is streamed
  video and live data, so there is little to offer offline. If a service
  worker is added, it caches only the app's own static files and an
  offline notice, and **never caches API responses**: those carry media
  URLs that expire within the hour, and must stay subject to the
  budget-safe fetch rules in §3. It also never fetches anything ahead of
  the visitor.
- **Budget:** none. A manifest and icons are static files.
- **Work:** a manifest, an icon set (and an Apple touch icon for iOS),
  and the matching tags in `index.html`. The icons use the kingfisher
  identity (§3): the XBOX**CLIPS** wordmark's orange on the navy ground.
- **Later options:** the installed app could register as a share target,
  so sharing a clip link from another app opens it here (Web Share Target,
  Chromium only).

### P6 — Game screenshots (built 2026-10-18)

Screenshots were left out of v1 (§10). This brings back one kind.

**As built:** the game page shows a Screenshots section between the stats
bar and the description, from `GET /api/v1/games/:productId/screenshots`.
On wide screens, one large screenshot with a "SCREENSHOT · N / total"
badge, previous and next arrows, and its caption on a dark bar; beside it
the next three as thumbnails and a "+N MORE" tile. On phones, a row to
swipe, each screenshot with an "N / total" chip and its caption below. A
caption is also the image's alt text; without one, the caption bar is left
out and the alt text is empty. A placeholder holds the section's place
while loading; with no screenshots, or if they fail to load, the section
is left out. Opened from the home page, the game itself still costs no
request; only its screenshots are asked for.

- **Store screenshots of a game, on the game page.** The store's detail
  payload (`POST /v2/marketplace/details`) carries the game's
  screenshots: 23 distinct 4K images for Gears of War: E-Day, each listed
  twice, with descriptive captions that make good alt text; 3 for
  Titanfall, 1920×1080 with empty captions. So the count varies widely and
  captions are optional. A detail response is about 100 KB per game, so
  one call per game, not a batch of the whole ranking.
  The most-played payload does not (checked 2026-10-18: its 25 games
  carry box art, poster, hero art and square promotional art only), so
  the API needs one store-detail call per game. Store images don't
  change, so a 7-day cache keeps that to at most one call per game a
  week, shared by every visitor.
- **Players' own screenshots: dropped.** OpenXBL lists
  `GET /v2/dvr/screenshots/{xuid}`, but on 2026-10-18 it returned an
  empty list for two players, one of them an account known to have
  screenshots and whose clips are public. Without data there is nothing
  to design or build.

### P7 — Mythics (built; designed on the canvas 2026-11-01)

A game is **Mythic** once a player has earned all its achievements, and it
stays Mythic if more are added later, so a Mythic can sit below 100%. A
player's total can be higher than the Mythics we can list: the history stops at
1,000 games, and one player showed 13 in total, 7 listed, 1 in their last 100.

- **Badge:** our own laurel in the kingfisher orange, with a lighter star. The
  data supplies no icon, and Microsoft's artwork isn't used. Drawn in the
  canvas's "Mythic badge" page; it becomes one shared SVG component. It stays
  off box art: too fiddly below about 24 px.
- **A Mythic game:** the laurel beside its name and a **gold** progress bar
  (`#f2c14e`, a new `--gold` token). No outline on the art or the card. Other
  games keep orange. The bar shows the real percentage, gold even below 100%.
- **Achievements page:** the laurel and "13 Mythics" in the header, beside Back
  to player on desktop and beside the gamertag on phones. The games appear
  first. The count is asked for only once the games show a history to read, and
  a first read can take about 30 seconds, so a shimmer holds its place. With
  none, or if it can't be read, it is left out, without an error.
- **Per-game page:** a gold gamerscore bar, and a larger laurel with "Mythic"
  under the title strap, no outline on the art. Not "completed": a Mythic can sit
  far below 100%, one at 18% has been seen. It relies on
  the game being among the recent 100, or on every listed achievement being
  unlocked.
- **Not on the player page.** The count needs a full read of the title history,
  which career stats deliberately avoid until someone scrolls, so the player
  card stays as it is.
- **Cost:** the flag comes with the recent games. The count is one upstream call
  per player per day, only when someone opens that player's Achievements page.

### P8 — Nearest completion (built; designed on the canvas 2026-11-01)

The Achievements page has three buttons beside its section heading, Recent (the
default), Nearest completion and Mythics, styled like the tabs on a game's achievements
page. Nearest completion shows the player's 100 started, unfinished games nearest
to complete, from their whole history, not just their last 100; completed games,
Mythics and games not started are left out.

- **Mythics:** up to 100 Mythic or fully earned games, most recently played
  first. A note at the foot of the list says "7 of 13, from their last 1,000
  games" only when the player's total is higher than the list, since the total
  counts games beyond the 1,000; otherwise there is no note. The button and the
  heading say "Mythic", matching "Recent". Both lists come from one read.
- **Cost:** the search runs only when either button is pressed, never on load or
  from a link. It is one upstream call and not cached by the API, measured at 11-17
  seconds and 10-14 ms of CPU for players at the 1,000-game limit. The browser
  keeps the result for 5 minutes, so switching back and forth doesn't search again.
- **Waiting:** a shimmer grid, with no message on screen. If it fails, Try again;
  Recent still works.
- **Back from a game** returns to this list: the choice is kept in the history
  entry, not the URL, so a shared link never starts a search.

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
   replay, with REPLAY and duration badges; the name strap (game, then
   gamertag and date) sits flush below the video at every size, always
   visible. Beside it (below on phones) the player card: gamerpic,
   gamertag, three stats (gamerscore, clips, last clip as "N days ago") and
   an ACHIEVEMENTS tile, "SEE GAMES ›", leading to the player's recent
   games. (Reel length was dropped: it said little.) If a clip leaves Xbox within 30 days, a notice at the foot of
   the page says which and when; it is kept out of the space above the
   fold. "COPY REPLAY LINK" and share act on the replay. UP NEXT lists the
   other clips, and is left out when there are none. A long reel is cut
   down to two rows of the desktop grid, so career stats stay in reach:
   with more than eight other clips, it shows seven and a "SEE ALL N
   CLIPS" tile leading to `/player/:identifier/clips`. No new
   requests: the profile and clip list are already fetched.
5. **Clip page** (the share link). The same replay and strap, a line with
   duration and "On Xbox until about <date>", COPY LINK (solid) and share,
   a "FROM THE REEL OF" card (gamerpic, gamertag, gamerscore, clip count)
   with SEE MORE (to the player page), and UP NEXT. This adds the player's profile
   and clip list to the page: two cached API requests, the list usually
   already fresh because resolving the clip fetched it.
6. **Game page.** The banner with "NO. 1 · MOST PLAYED ON XBOX" badges and
   the name strap, a stats bar (released, rating, genre, plays on), the
   description, the find-clips panel, and ALSO MOST PLAYED (the next
   ranks, excluding this game).
7. **Phones.** Below 720 px: the replay and banners run edge to edge; the
   strap below the video is the same as on desktop; stats become a 2×2 grid; UP NEXT a list; most-
   played rows scroll sideways; the header search shrinks to a compact box.
8. **Docs and checks.** README, CLAUDE.md and TODO updated; tests cover the
   ticker, the stats, the expiry notice, views hidden at zero, and the
   merged player page.
9. **Player intro.** A cold player load takes about two seconds: the
   profile (about 1.0 s), then the clip list, which needs the profile's
   XUID (about 0.8 s more). Instead of "Loading…" text, the wait plays as
   a broadcast intro. The orange name strap slides in with the gamertag
   from the URL over "NOW LOADING THE REEL"; when the profile lands, the
   gamerpic flips in, "GOOD PLAYER · 22 YEARS ON XBOX" replaces the
   loading line and the gamerscore counts up; when the clips land, an
   orange and blue diagonal wipe reveals the page with the replay
   starting. Rules: no intro if the data is ready within 600 ms, so cached
   players never see it; once shown it stays at least 700 ms, so it never
   flashes; it never waits for anything but the data. A URL holding an
   XUID has no name for the strap until the profile lands. With the
   system's reduced-motion setting, every slide, flip and wipe becomes a
   short fade and the gamerscore shows at once. If a request fails, the
   wipe reveals the error. This changes only the UI; the requests are
   unchanged.
10. **Throttled profiles.** Microsoft throttles profile calls more than
   any other, and a throttled profile with nothing cached used to blank
   the player page with an error. Now, when the profile fails with
   `UPSTREAM_RATE_LIMIT` or `UPSTREAM_ERROR`, the page asks for the clips
   by the identifier in the URL; the API needs only its cached
   gamertag-to-XUID mapping for that. The reel shows as usual with a
   plainer player card: the gamertag from the URL, a gamerscore of "–" and
   "Profile details unavailable right now". The reel page does the same.
   Any other profile failure (such as `PLAYER_NOT_FOUND`) still shows its
   error, with no clips request; if the clips fail too, the profile's
   error is shown. When only the clips fail (an upstream hiccup with no
   earlier list to fall back on), the replay's slot shows the empty-state
   panel in the same voice: "Their clips didn't load just now. Check back
   in a moment." with a Try again button. The player card (clips and last
   clip as "–") and career stats still show. The API also keeps profiles fresh for 12 hours, so
   they are fetched less often.
11. **Pinned and recent players.** Kept in local storage under
    `xboxclips.players.v1`, on the device only: gamertag, XUID, gamerpic
    URL and a timestamp per player. A player goes into Recent when their
    page loads with a profile (not after a failed lookup, nor when the
    profile is throttled); Recent keeps the last 8 and leaves out pinned
    players, and pinned players (up to 12) stay first everywhere. The home
    page shows **Pinned** and **Recent** under the search, each left out
    while empty: cards with gamerpic, gamertag, a pin toggle and, for
    recent players, a remove button, plus "Clear recent", which never
    touches pinned players. On phones they become rows of round avatars,
    pinned ones ringed in orange. The header search on every other page
    lists the same players while focused, filtered as you type, and works
    from the keyboard as a combobox. The player card has a Pin button.
    Storage that is blocked or unreadable simply means empty lists. Costs
    no requests.
12. **Back navigation, one way everywhere.** A player's secondary pages
    (their whole reel, their games, a game's achievements) share one
    header: gamerpic, gamertag, a label ("Clips", "Achievements"), and an
    outline Back button on the right, full width on phones. It goes one
    level up: "Back to player" from the reel and the games list, "Back to
    games" from a game's achievements. There are no other back links on
    those pages.

## 13. Current status

Updated 2026-10-17.

**Redesigned** in the Broadcast look, in kingfisher colours (§3, §12), on
desktop and phone, with the player intro over slow loads, installable as an app, with pinned and recent players, and achievements. 105 tests run
without touching the API.

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
  No component library (Q4, dismissed).
- `xboxclips.io` is already a Cloudflare zone on the account (§3).
- v1 scope: search and shelf; clip page with playback and sharing (§1).
- The share link is the clip page URL, with previews from a Pages
  Function on `/clip/*` (§3, §7).
- The Broadcast look in kingfisher colours, with the player page merged
  with the replay (§3, §12).

### Next steps, in order

1. **Open tabs and new builds** (§15): planned 2026-11-07, not built.

Observability on the UI (§14) was dropped on 2026-11-06; a second player
for comparison (the rest of P2) was deferred indefinitely on 2026-11-03.

## 14. Observability

**Dropped 2026-11-06: not needed yet.** Kept below as the reasoning if it
comes back. The API's side goes ahead without it, alerting through
Cloudflare's own monitors and without the shared request ID this
section relied on (API `PLAN-v1.md` §11).

Drafted 2026-11-04, after the API's plan (API repo, `PLAN-v1.md` §11),
whose decisions this follows where they apply. Nothing here is built.
Unlike the API's, this plan starts by asking whether the work is worth
doing at all (§14.1); "no", or "only the smallest version", are
acceptable outcomes.

### 14.1 Is it worth it?

The UI logs nothing today. Every failure is handled quietly in the
browser and lost: render errors end on the router's error page, failed
API calls show the visitor a message, playback errors retry silently,
broken images are hidden, and the preview function falls back to the
plain page.

Much of what the UI could report is already in the API's logs: any API
error the browser receives was logged by the API first. **The UI does not
report API errors.** What only the browser can see:

| Failure | Why the API can't see it | Value |
| :--- | :--- | :--- |
| Video playback fails | Media streams from Xbox's CDN straight to the browser (§5) | **High.** Playback is the product, and this is the evidence the API's closed question O1 ("some media URLs die before their `expiration`") waits on |
| The app crashes or a page fails to render | Happens after a successful response | **High.** Today it ends on a generic error page and nobody knows |
| A request gets no usable answer | It never reached the API (offline, DNS), or the browser refused the response: a CORS slip on a new preview origin is a `200` in the API's logs and a failure here | Medium: rare, invisible otherwise |
| Device and browser problems (Android full screen, install) | Needs the user agent and what happened on screen | Medium: the deferred Android item (TODO) waits on this |
| Images fail (store art, older Xbox 360 art) | Served by Xbox and the store directly | Low: already handled by hiding the image |

Against that, the costs:

- **Bundle weight.** 127 KB gzipped today. A full error-tracking SDK adds
  perhaps 20-30 KB gzipped (to be measured, §14.6).
- **Privacy.** IPs, user agents and the gamertags in URLs are personal
  data. The site has no cookies, no analytics and no consent banner
  today, and should keep it that way (§14.2).
- **A third party** receiving data about visitors, and one more service
  to look after.
- **Effort**, small next to the API's: there is no existing logging to
  migrate.

**The decision rule.** Go ahead only if the spike (§14.6) finds a hosted
service whose free tier fits, whose bundle cost is acceptable, and that
can be set up without storing identifiers. If the SDK is too heavy, the
fallback is a hand-rolled reporter for the two high-value events only
(playback failed, app crashed), posting to the same service's ingest
endpoint. If neither works, drop the feature and record why here.

### 14.2 Constraints

- **Best effort.** Browsers are uncontrolled: devices, extensions and
  networks vary, and some reports will be lost. That is accepted.
- **Straight to a hosted service, free tier.** The browser sends directly
  to a service like Sentry. Ad blockers block the well-known ones, so
  reports from visitors running one are lost. If that loss becomes a
  problem, proxy through a Worker on our own domain, which also costs
  Worker requests from the shared free allowance; not before.
- **Events are sent as they happen.** They are rare (errors, not page
  views), so nothing is batched and nothing needs flushing when the page
  closes. No service worker exists to queue them, and none is added for
  this.
- **Privacy, without a consent banner.** No stored identifiers: a session
  ID, if used, lives in memory only and dies with the tab. No gamertags:
  reports carry route patterns (`/player/:id`), never URLs. IP storage
  off at the service if it allows. A short privacy note on the site says
  what is collected and why. (Error reporting without stored identifiers
  generally doesn't need consent in the UK; this is a working reading,
  not legal advice, and is checked before launch.) If these conditions
  can't be met, the feature is dropped (§14.1).
- **Abuse.** A browser-side key for a reporting service is public by
  design, so anyone can send junk to that project. The service's own
  limits and inbound filters (allowed domains, rate limits) are the first
  line. If we proxy later, our own Worker can add more: short-lived
  access tokens issued by the site, size limits, a per-IP limit. Not an
  objection to starting, but recorded so it isn't forgotten.
- **Readable stack traces.** The production build is minified and emits
  no source maps. Error reports are hard to read without them; the
  service may accept uploaded maps (built in CI, never published with the
  site). Not a blocker: noted for the spike.

### 14.3 Decisions so far

- **Same conventions as the API.** A `Logger` interface of ours, events
  from one registry with stable names, levels with `debug` only in local
  builds, identifiers as separate fields, and alert-marked events (API
  §11.2). The service's SDK, if used, sits behind it.
- **Correlation through `X-Request-Id`.** The API returns its request ID
  on every response (API §11.2). The API client keeps it, and any UI
  event about that call carries `requestId`, so a report finds the API's
  log lines for the same request.
- **Alerting.** The service's own alerting, folded into the same quiet
  end-of-day summary as the API's where it can be: nothing pages anyone.
- **The preview function stays in this repo.** It is the UI's server
  side (it rewrites the UI's own HTML, §7), so it is not moved to the API.
  It logs as the API does, with the same interface, sends its own
  `X-Request-Id` over the service binding (the API accepts a well-formed
  one), and logs its fallbacks (timeout, API error) instead of swallowing
  them silently. If keeping two copies of the logger aligned becomes a
  chore, a small shared package solves it.

### 14.4 Events

Only what the browser alone can see (§14.1).

| Event | When | Fields | Answers |
| :--- | :--- | :--- | :--- |
| `playback.failed` | The video element errors, before the automatic retry | Media error code, seconds until the URL's `expiration`, clip age, browser family, `requestId` of the clip fetch | Are URLs dying early, how early, on which browsers (API O1) |
| `playback.recovered` / `playback.gave_up` | After the retry | As above | Does the one retry (§5) suffice |
| `app.crashed` | Router error element, or an uncaught error or rejection | Message, stack, route pattern | What breaks and where |
| `request.unanswered` | The API client gets no response or an unreadable one | Route pattern, error name | Network and CORS failures the API can't see |
| `device.issue` | Reserved for specific cases such as the Android full-screen problem, added when needed | User agent, the case | How many visitors a device bug affects |

Not reported: API error responses (the API has them), image failures
(low value), page views and analytics (out of scope, §10).

### 14.5 What would make this not worth it

Recorded so the spike can end the work early: no free tier that fits;
an SDK too heavy and a hand-rolled reporter not worth maintaining; a
service that insists on storing IPs or setting identifiers; or, after a
few weeks live, reports that tell us nothing the API's logs didn't.

### 14.6 Spike, first in the work

1. **The service.** Sentry's free tier (limits, retention, EU data
   region, turning IP storage off, inbound filters, alert emails), and at
   least one alternative (a Sentry-compatible host such as GlitchTip, or
   Grafana Faro on Grafana Cloud's free tier). Verified against their
   current pricing pages, not memory.
2. **Bundle cost.** Build with and without the SDK, trimmed to errors
   only (no tracing or session replay), and compare gzipped sizes.
   Compare with a hand-rolled reporter posting to the same ingest
   endpoint.
3. **Privacy setup.** Confirm the chosen service can work with no stored
   identifiers and route patterns instead of URLs; draft the privacy
   note.
4. **Source maps.** Whether the service takes uploaded maps from CI
   without the maps being served by the site.
5. **The preview function's logs.** Whether Pages Functions logs are kept
   in Workers Logs as the API's are, or only seen live; that decides
   where its events can be read.

### 14.7 Order of work

1. The spike; findings recorded here, ending with go, smallest version,
   or drop (§14.1).
2. If go: the logger and event registry, the `X-Request-Id` handling in
   the API client, and the privacy note.
3. `playback.*` and `app.crashed` first, the high-value pair.
4. The preview function's logging.
5. A few weeks live, then the §14.5 check: keep, trim, or remove.

## 15. Open tabs and new builds

Planned 2026-11-07, not built. **The goal: a tab left open never runs an
old build forever.**

### The problem

Fresh loads are already current: Vite names each bundle by its content
hash, and Pages serves `index.html` with `max-age=0, must-revalidate`.
But the app never reloads itself, so a tab left open, put to sleep by
the browser, or restored with a session keeps the bundle it first
loaded. Seen 2026-11-07: an Edge tab from weeks earlier still calling the
API's `workers.dev` host after the move to `/api` (API `PLAN-v1.md` §6).

### Design

- **Build ID.** The build writes `version.json` (the commit SHA) into
  `dist/` and embeds the same ID in the bundle.
- **Detection, in one module (`src/lib/build.ts`).** On `visibilitychange`
  to visible and on window `focus`, it fetches `version.json` with
  `cache: 'no-store'`, **at most once an hour**. No timer: every way a tab
  goes stale (backgrounded, slept, restored, an app switched away from)
  passes through becoming visible again. The fetch is fire-and-forget;
  failures are ignored until the next check. A differing ID sets an
  in-memory "newer build" flag.
- **Switching, on the next navigation.** The root route in
  `src/routes.tsx` checks the flag before each navigation renders and, if
  set, throws `redirectDocument(destination)`: React Router abandons the
  client-side navigation and does a full load of the URL the visitor was
  heading to. Nothing interrupts a clip that is playing; the visitor sees
  an ordinary page change. Pages and components don't change.
- **The navigation check never fetches.** It reads the flag and returns.
  A test holds this: a navigation completes while `version.json` is
  still pending.

- **The build ID on API requests.** The API client sends the same ID as
  an `X-App-Build` header on every call (same-origin, so no preflight).
  Workers Logs keep request headers on Cloudflare's own record of each
  request, so the API needs no change to show which build a request
  came from. Requests without the header come from older builds.

### Choices made

- **Hook:** a root `loader` with `shouldRevalidate: () => true`, or root
  `middleware` (stable in React Router 8) if client middleware turns out
  to run on every navigation with no loaders present. Check when
  building.
- **No timer, no 5-minute throttle.** An hour between checks is enough:
  a tab notices a deploy within an hour of becoming visible, then
  switches on its next navigation. Breaking changes go through a staged
  rollout anyway.
- **Not a service worker.** It would add a cache layer that can itself
  serve stale code; the app has none (§11, P5).

### To check when building

- **Back and forward.** The browser has already moved the URL; make sure
  the full load doesn't leave a duplicate history entry. If it does,
  use `location.reload()` for those.
- **The known gap:** a tab kept visible and focused across a deploy
  stays old until it next loses and regains focus. Rare; if reports come
  in, add a background check on navigation, at most once an hour.
- **Optional later:** a `minimumBuild` in `version.json`, for a change
  that must reach open tabs promptly: an older tab reloads at once while
  hidden, or shows a banner while visible.
