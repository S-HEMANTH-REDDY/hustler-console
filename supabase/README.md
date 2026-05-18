# Supabase setup

Hustler is **multi-tenant once Supabase is configured** and **single-user
local-only when it isn't**. You can keep using the app today with no setup;
follow this guide when you're ready to add login, sync across devices, and
host it publicly for up to ~700 users on the free / Pro tier.

## 1. Create the project

1. Sign in at [supabase.com](https://supabase.com) and create a new project.
   - Region: pick the one closest to you / your users.
   - Database password: store it somewhere safe.
2. Once it's done provisioning, go to **Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
3. In the repo root, copy `.env.local.example` to `.env.local` and paste the
   two values in:

   ```bash
   cp .env.local.example .env.local
   ```

That's enough for the app to flip from local-only mode to auth-gated mode
on next `npm run dev`.

## 2. Run the schema migration

The full schema (tables, RLS policies, triggers, storage buckets, storage
policies) lives in [`migrations/00001_init.sql`](./migrations/00001_init.sql).

The simplest way to apply it:

1. Supabase Dashboard → **SQL** → **New query**.
2. Paste the entire contents of `00001_init.sql`.
3. Click **Run**. It's idempotent — safe to re-run if you tweak it.
4. Run [`migrations/00002_passion_schedule.sql`](./migrations/00002_passion_schedule.sql) the same way **after** `00001_init.sql` (adds the private per-user Passion timetable table).

If you prefer the CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

After it runs you should see in the dashboard:

- **Database → Tables**: `profiles`, `settings`, `applications`,
  `dsa_problems`, `system_design_problems`, `behavioral_stories`, `tasks`,
  `passion_ideas`, `passion_attachments`, `resume_files`, and (after
  `00002_passion_schedule.sql`) `passion_schedule`.
- **Database → Policies**: 4 policies per table (`*_select`, `*_insert`,
  `*_update`, `*_delete`).
- **Storage → Buckets**: `resumes` and `passion`, both private.

## 3. Configure auth providers

In **Authentication → Providers**:

### Email + password (default)

- **Email** provider is on by default.
- Optional but recommended: **Confirm email** on. When on, new users get a
  confirmation link and can only sign in after clicking it.
- **Authentication → URL Configuration**:
  - **Site URL**: your production origin (e.g.
    `https://your-username.github.io/hustler-console/` for GH Pages, or
    `https://hustler.example.com` for a custom domain).
  - **Redirect URLs**: add both the local dev URL and the production URL.
    Wildcards are allowed.
    ```
    http://localhost:5173/**
    http://localhost:4173/**
    https://your-username.github.io/hustler-console/**
    ```

### Google sign-in

1. In **Google Cloud Console** (any project): **APIs & Services → Credentials
   → Create OAuth 2.0 Client ID** of type *Web application*.
2. **Authorized redirect URIs**: paste the callback from your Supabase
   dashboard (Authentication → Providers → Google → copy the URL shown,
   it looks like `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Copy the resulting **Client ID** and **Client Secret** back into the
   Supabase **Google** provider section and enable it.
4. Add your app origin under **Authorized JavaScript origins** in Google
   Cloud (same list as the redirect URLs above).

You should now see the **Continue with Google** button work end-to-end:
click → Google consent → bounce back to the app already signed in.

## 4. Storage quotas

The free tier allows **1 GB of storage** and **5 GB egress per month**. For
~700 users you'll outgrow that quickly once people start uploading PDFs —
upgrade to **Pro ($25/mo)** when the storage gauge in the dashboard hits
~80 %.

We enforce two limits in the app today:

- `RESUME_MAX_BYTES = 8 MB` per resume (see `src/lib/resume.ts`).
- `PASSION_MAX_BYTES = 12 MB` per Passion attachment (see
  `src/lib/passion.ts`).

Phase 2 of the migration adds a **per-user total quota** and a usage gauge
on the Settings page.

## 5. Running locally with Supabase

```bash
npm install
npm run dev
```

You should see a sign-in screen first. Create an account, then everything
in the app should behave exactly as before but now persisted in Postgres
and isolated to your user.

## 6. Going back to local-only

Remove `.env.local` (or delete the two `VITE_SUPABASE_*` keys) and restart
`npm run dev`. The app drops the auth gate and reverts to the original
IndexedDB-only behaviour. Useful for offline / hacking on a plane.
