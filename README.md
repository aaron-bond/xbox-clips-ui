# xbox-clips-ui

Frontend for a social hub for sharing Xbox game clips, served at
`https://xboxclips.io`. Enter a gamertag, browse that player's clips, play
one and share a link to it. No login for anyone.

A React single-page app on Cloudflare Pages, plus one Pages Function that
gives clip links real previews in chat apps. Data comes from
[xbox-clips-api](https://github.com/aaron-bond/xbox-clips-api). The design
and the reasoning behind it are in [PLAN-v1.md](PLAN-v1.md).

## Local development

Needs Node 24+.

```sh
npm install
npm run dev        # http://localhost:5173
```

The dev server uses the production API, which allows `localhost:5173`.
**Every new player looked up spends the shared upstream budget of 150
requests per hour**, so test sparingly. To use a local API instead, run
xbox-clips-api with `npm run dev` and put
`VITE_API_BASE_URL=http://localhost:8787` in `.env.local`.

| Command | Does |
| :--- | :--- |
| `npm run dev` | Vite dev server for the app. The preview function does not run here. |
| `npm test` | App tests in a simulated browser, function tests in the Workers runtime. Never calls the API. |
| `npm run typecheck` | Regenerates runtime types from `wrangler.jsonc`, then type-checks app and function. |
| `npm run build` | Production build into `dist/`. |
| `npx wrangler pages dev dist` | Serves the build with the preview function. The API binding is not connected locally, so clip pages get the generic tags. |

## Deployment

Cloudflare Pages' Git integration builds and deploys this repository:
`main` to production, every other branch and pull request to its own
preview URL. GitHub Actions runs typecheck, tests and a build on every pull
request and on `main`.

One-time setup, in the Cloudflare dashboard:

1. **Workers & Pages → Create application**, then take the **Pages**
   entry on that page (the default flow there creates a Worker, which is
   wrong for this repo), then **Connect to Git** and pick this
   repository. Name the project `xbox-clips-ui`; the API's allowed origins
   assume that name.
2. Build settings: framework preset **None**, build command
   `npm run build`, output directory `dist`.
3. After the first deploy, **Custom domains → Set up a domain** →
   `xboxclips.io`, then the same for `www.xboxclips.io`, and redirect `www`
   to the apex.

The API service binding and other settings come from `wrangler.jsonc`,
which is the source of truth for a Pages project that has one.
