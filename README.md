# Hustler

Personal dashboard for the job hunt — pace bar, day ribbon, APS / DSA /
behavioral / system design tracks, a Passion research workspace, and a 45-min
think timer. Built with React 19, Vite 6, Tailwind v4, Dexie (IndexedDB),
Zustand and react-router. Installable as a PWA.

The app ships in **two modes**:

| Mode | When | Data | Auth |
|---|---|---|---|
| **Local-only** | `VITE_SUPABASE_URL` not set | IndexedDB only, single browser | none |
| **Multi-user** | Supabase env vars set | Supabase Postgres + Storage, RLS-isolated per user | Supabase Auth (email + Google) |

Local-only is the original personal-use experience. Multi-user mode is what
you turn on when you want to deploy this publicly — each visitor signs up,
gets their own private rows, and can use the app from any device.

## Run it

```bash
npm install
npm run dev
```

Without `.env.local`, you'll get the local-only experience right away.
For multi-user / public deployments, see [`supabase/README.md`](./supabase/README.md)
for the end-to-end setup (create project → run SQL migration → wire Google
OAuth → drop the keys into `.env.local`).

Hosted on GitHub Pages at `https://<user>.github.io/hustler-console/` once the workflow runs.

## Scripts

- `dev` — local dev server
- `build` — production build to `dist/`
- `preview` — serve the build locally
- `lint` — eslint

## Data

**Local-only mode**: everything sits in IndexedDB (db name
`execution-console-v1`). Settings → Export JSON saves a full snapshot
including resume binaries (base64). Import is a full replace. Reset wipes
the DB and re-seeds defaults. Clearing site data wipes everything — export
every week (the top bar warns when the last backup is older than 7 days).

**Multi-user mode** (phase 2, in progress): rows live in Postgres, files
live in Storage. Row-level security ensures `user_id = auth.uid()` on every
read/write. Existing local data is offered as a one-time import on first
sign-in.

## Deploy

GitHub Pages via the workflow at `.github/workflows/deploy.yml`. It runs on push to `main`, builds with `GITHUB_PAGES=1` so Vite picks up the right base path, and publishes `dist/`.

If you fork, change the `repo` constant in `vite.config.ts` to match your repo name.

## Hotkeys

- `⌘K` or `/` — command palette
- `A` — focus the quick-log form
- `g` then `t a d y b k s` — jump to Today / Applications / DSA / System Design / Behavioral / Tasks / Settings

## License

Personal use. No license attached.
