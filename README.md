# Hustler

Personal dashboard I use every day for the job hunt. Local-first, no backend, lives in the browser.

Pace bar tells me if I'm on track for 30–50 apps today. Day ribbon shows the last 4 weeks at a glance with tick marks per track (apps / DSA / behavioral / system design). Attached resumes are stored in IndexedDB so I can pull them up before an interview without digging through Drive.

Built with React 19, Vite 6, Tailwind v4, Dexie (IndexedDB), Zustand, react-router. Installable as a PWA.

## Run it

```bash
npm install
npm run dev
```

Hosted on GitHub Pages at `https://<user>.github.io/hustler-console/` once the workflow runs.

## Scripts

- `dev` — local dev server
- `build` — production build to `dist/`
- `preview` — serve the build locally
- `lint` — eslint

## Data

Everything sits in IndexedDB (db name `execution-console-v1`). Settings → Export JSON saves a full snapshot including resume binaries (base64). Import is a full replace. Reset wipes the DB and re-seeds defaults.

Clearing site data wipes everything. Export every week — the top bar yells at me if my last backup is older than 7 days.

## Deploy

GitHub Pages via the workflow at `.github/workflows/deploy.yml`. It runs on push to `main`, builds with `GITHUB_PAGES=1` so Vite picks up the right base path, and publishes `dist/`.

If you fork, change the `repo` constant in `vite.config.ts` to match your repo name.

## Hotkeys

- `⌘K` or `/` — command palette
- `A` — focus the quick-log form
- `g` then `t a d y b k s` — jump to Today / Applications / DSA / System Design / Behavioral / Tasks / Settings

## License

Personal use. No license attached.
