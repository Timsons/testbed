# Testbed

Express (`server/`) + React via Vite (`client/`), run together with `npm run dev` from the root. See `CLAUDE.md` for the full stack/conventions rundown.

## Local development

```
npm install
npm run dev
```

This starts the Express API (port 3001) and the Vite dev server (port 5173, proxying `/api` to Express) side by side.

## Deploy

The app deploys as a **single free Render Web Service**. One Node process builds the React client and serves both the built client and the `/api/*` routes (see `server/index.js`) — there's nothing else to provision.

### The free tier's one real limitation — read this first

Render's free web service plan has **no persistent disk**. This app stores everything — test cases, bugs, screenshots, settings — in a SQLite file at `server/data.db`. On the free plan, that file is wiped every time the service redeploys **or** wakes up from spinning down after 15 minutes of inactivity (which is often, since free services spin down whenever nothing has hit them for that long). Every fresh visit after an idle spin-down starts the app from its seed data again.

That's fine for sharing a live demo link. It is **not** fine if you need the data to actually stick around. If that changes, upgrade the Render service to the Starter plan ($7/mo) and attach a persistent disk (from $0.25/GB/mo) mounted at `server/` — no code changes needed, since `better-sqlite3` already just opens whatever `server/data.db` it finds on disk.

(The other well-known free hosts don't do better here: Vercel/Netlify/Cloudflare Pages's free tiers only run serverless functions with no writable local disk at all, so SQLite doesn't work there in any form. Fly.io and Railway no longer have a real ongoing free tier for an always-on Node service as of this writing.)

### One-time setup

1. `render.yaml` at the repo root already describes the service (build command, start command, health check, Node version). Render reads it automatically — no manual field-filling.
2. Push this repo to **GitHub** (Render's Blueprint flow needs a GitHub, GitLab.com, or Bitbucket.org-hosted repo — not a self-hosted git server).
3. In the Render dashboard: **New → Blueprint → select the repo → Apply**. Render provisions the free web service straight from `render.yaml`.
4. First deploy takes a few minutes (native module compile for `better-sqlite3` + client build). Render gives you a `https://<name>.onrender.com` URL when it's done.

### Environment variables (all optional)

See `.env.example`. Nothing needs to be set for the app to run:

- `DISCORD_WEBHOOK_URL` — posts an alert to Discord when a test run result is marked "failed". Set it in the Render dashboard's Environment tab (not in `render.yaml` or git) if you want this.
- `APP_BASE_URL` — only needed if the app is ever served from a different public URL than the one Render assigns it.

`PORT` is set automatically by Render — don't set it yourself in production.
