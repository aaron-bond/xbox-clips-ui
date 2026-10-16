# UI Plan — v1

**Status:** proposed, not yet built. Written 2026-10-16.
**Where this stands right now, and what to do next: §11.**

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
match the shared budget: no automatic retries on 4xx, no refetch on
window focus, and a clip's cached data is considered stale 5 minutes
before its `media.expiresAt`.

**CSS Modules for styling; a component library is optional and
deferred.** CSS Modules are built into Vite and need no dependency, which
is enough to start. A component library may be brought in if it proves
useful. The look to aim for is a dark, media-first clip site in the
style of [GamerDVR](https://gamerdvr.com/gamer/major-nelson/videos): a
player header above a grid of clip thumbnails. Similar, not a copy. The
choice of library, if any, is Q4 (§9).

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

**No visitor state in v1.** Recent gamertags and favourites are out of
scope (§10).

---

## 4. Routes

| Path | Page |
| :--- | :--- |
| `/` | Search: a gamertag box. |
| `/player/:identifier` | Shelf: profile header and clip grid. Gamertag or XUID. |
| `/clip/:xuid/:clipId` | Clip page: player, details, share. Also the share link. |
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

- **Copy link** puts `https://xboxclips.io/clip/:xuid/:clipId` on the
  clipboard and confirms briefly.
- **Native share** (`navigator.share`) is offered where the browser
  supports it, which covers most phones.

---

## 7. Link previews

A Pages Function at `functions/clip/[xuid]/[clipId].ts` handles every
request to `/clip/*`:

```
crawler or person → xboxclips.io/clip/<xuid>/<clipId>
  1. validate both params; invalid → serve the page unchanged
  2. get the base HTML from the static build
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

Made in `xbox-clips-api` and recorded in its own plan. B1–B3 are done;
B4 waits on the preview function existing.

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
  binding, not from the visitor, so every crawler would share one
  bucket. The function forwards the visitor's IP. Exactly how the API
  sees the IP of a service-binding request needs verifying when this is
  built (§9, Q1).

An API custom domain such as `api.xboxclips.io` becomes possible once the
zone is on Cloudflare. It is not needed for v1.

---

## 9. Open questions

- **Q1 — Client IP over a service binding.** What `CF-Connecting-IP`, if
  any, the API sees on a request from the preview function, and whether
  a forwarded value can be trusted. Determines B4.
- **Q2 — Thumbnail as `og:image`.** Xbox serves thumbnails as
  `application/octet-stream`, not `image/png`. Whether Discord, WhatsApp,
  iMessage and Slack accept that is untested. If they reject it, previews
  have a title but no image.
- **Q3 — Base HTML in the function.** Whether `next()` returns the root
  page for a `/clip/*` path through the single-page-app fallback, or the
  function must fetch `/` from its assets explicitly.
- **Q4 — Visual design and component library.** No design yet. The
  reference is the layout style of GamerDVR's player video pages (§3).
  Whether a component library helps reach it is decided when the UI
  takes shape; v1 can start with CSS Modules alone.

---

## 10. Deliberately out of scope for v1

- **Recent gamertags and favourites.** Device-only state; the obvious
  next feature.
- **Dedicated expired and restricted states.** v1 shows the API's
  message. A designed state for `CLIP_EXPIRED` and `restricted` access
  comes later.
- **`availableUntil` display.** The data is there; showing it is later.
- **Pagination** beyond the first page of clips.
- **Short share links.** Possible without stored state by packing both
  identifiers into one code; not needed yet.
- **Logs and analytics.** To be handled separately.
- **Screenshots, accounts, any database.**

---

## 11. Current status

Updated 2026-10-16.

**Nothing is built.** The repository holds this plan and a one-line
README. The backend serves every route in §2, and already allows this
project's origins (§8).

### Settled

- Cloudflare Pages with Git integration, on `xboxclips.io` (§3).
- React, Vite, TypeScript, React Router, TanStack Query, CSS Modules (§3).
  A component library is optional and deferred (Q4).
- `xboxclips.io` is already a Cloudflare zone on the account (§3).
- v1 scope: search and shelf; clip page with playback and sharing (§1).
- The share link is the clip page URL, with previews from a Pages
  Function on `/clip/*` (§3, §7).

### Next steps, in order

1. Scaffold this repo: Vite app, routes, API client, playback, sharing,
   the preview function, tests, `README.md`, `CLAUDE.md`, `TODO.md`.
2. Create the Pages project with Git integration and attach the custom
   domain.
3. With the function live, settle Q1 and B4, and check Q2 by pasting a
   clip link into Discord and a messaging app.
