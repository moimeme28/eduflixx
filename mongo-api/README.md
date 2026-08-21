# EduFlix Mongo API

HTTPS gateway between the EduFlix app (Cloudflare Workers runtime) and MongoDB Atlas.
The app can't open raw TCP sockets, so the native Mongo driver lives here instead.

## Run locally

```bash
cd mongo-api
npm install
MONGODB_URI="mongodb+srv://..." MONGO_API_KEY="$(openssl rand -hex 32)" npm start
```

## Deploy (Render / Railway / Fly / any Node host)

- Start command: `npm start`
- Env vars: `MONGODB_URI`, `MONGODB_DB` (default `eduflix`), `MONGO_API_KEY`, `PORT`
- Health check: `GET /health`

Then give the app two secrets:

- `MONGO_API_URL` — e.g. `https://eduflix-api.onrender.com`
- `MONGO_API_KEY` — the same shared secret

## Migrating existing data

Set `POSTGRES_URL` (the current database connection string) plus the Mongo vars and run:

```bash
npm install pg
POSTGRES_URL="postgres://..." MONGODB_URI="mongodb+srv://..." npm run migrate
```

It copies `profiles`, `user_roles`, `classes`, `class_members`, `class_invites`,
`assignments`, `assignment_progress`, `favorites`, `assistant_threads` and
`assistant_messages` row-for-row, preserving `id` values so nothing breaks.

## Security model

Authentication stays with the app's existing login. This service trusts any
caller holding `MONGO_API_KEY`, so it must never be called from browser code —
only from the app's server functions, which enforce per-user ownership rules.
