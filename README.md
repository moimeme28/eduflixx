# EduFlix

An educational movie and series recommendation app. EduFlix helps students, teachers and lifelong learners find documentaries, films and series that match what they want to learn — turning screen time into study time.

## What it does

- **Discover by subject** — Browse Science, Mathematics, Technology, Engineering, Social Sciences, Health, Business, Arts, Environment and Life Skills.
- **Filter by topic, level and format** — Each subject has focused topics and filters for Beginner → Professional and Documentary / Series / Movie / Mini Series / Biography / Based on Real Events.
- **Get details** — View posters, synopsis, release year, rating, runtime, genres, trailers and full cast.
- **Watch it** — Each title page shows "Where to watch": real streaming, rent and buy providers for the viewer's country (TMDB/JustWatch data) with deep links out to the provider.
- **Smarter trailers** — Trailer discovery ranks official trailers above teasers and clips, with fallbacks (unfiltered video list, season 1 for series) so more titles play a video.
- **Save and annotate** — Sign in to bookmark titles and add personal study notes on the watchlist dashboard.
- **AI learning assistant** — Ask for recommendations ("I want to learn genetics", "World War II documentaries") and get threaded, explained suggestions.
- **Community lists** — Create, share and discover curated learning lists. Follow other learners and see lists from people you follow.
- **Classrooms** — Teachers can create classes, invite students by email (with automatic enrollment on sign-in), build playlists and assign titles; students track assignment progress.
- **Admin controls** — First user can claim admin access, then manage roles, users, classes and assignments.


## Recent improvements

- Title pages get streaming availability per region (auto-detected from the browser locale, falling back to US or any region with listings).
- Trailer lookup uses ranked video scoring and multi-stage fallbacks instead of a single query.
- Role assignment during signup is now repaired on sign-in — teacher accounts created with the wrong role are fixed automatically.
- The Mongo gateway opens connections lazily and stays healthy even when Atlas credentials are temporarily wrong, plus a root status endpoint (`/`) and a diagnostic route (`/api/public/mongo-diag`) in the app.
- The Back button on title pages returns to the previous page in the viewer's history instead of always going home.
- Social study clubs: public and private learning lists, user following, community discovery, and "Add to list" actions on titles.
- Password strength meter on sign-up — live checklist enforcing 8+ characters, uppercase, lowercase, number, and special character, with a visual strength bar.
- Google OAuth button removed — authentication is now email/password only (Supabase Auth).
- `.npmrc` with `legacy-peer-deps=true` added so `npm install` works alongside Bun (resolves `zod` v3/v4 peer dependency conflict between `@tanstack/zod-adapter` and the `ai` SDK).
- Student "enrolled classes" list fixed — `listMyClasses` now fetches class details separately instead of relying on PostgREST-style joins (which the Mongo gateway doesn't support). Students can now see their joined classes.
- Class invitation emails — teachers can now send real email notifications when inviting students, powered by Resend. Without `RESEND_API_KEY`, invites still work (auto-join on sign-in) but no email is sent.
- Orphaned Lovable auth integration removed — `src/integrations/lovable/` directory and `@lovable.dev/cloud-auth-js` dependency deleted (no longer imported after Google OAuth removal).
- AI chat provider switched from the OpenAI-compatible shim to the native `@ai-sdk/google` provider, and the model updated from the deprecated `gemini-2.0-flash-lite` to the rolling `gemini-flash-lite-latest` alias. Fixes "Function call is missing a thought_signature" errors on follow-up turns after a tool call.


## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start v1 (React 19 + Vite) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + Radix |
| Auth | Supabase Auth — email/password |
| App data | MongoDB Atlas |
| Movie data | TMDB API |
| AI | Google Gemini via `ai-sdk` (native `@ai-sdk/google` provider) |
| Email | Resend (class invitation emails) |
| Hosting | Cloudflare Workers (app) + Render/Railway/Fly (Mongo gateway) |

## Why MongoDB via a gateway?

The app runs on Cloudflare Workers, which cannot open raw TCP sockets. The native MongoDB driver needs a TCP connection, so a small companion Express service (`mongo-api/`) acts as an HTTPS bridge between the app and MongoDB Atlas. The app calls this gateway from server functions only; it is never exposed to the browser.

## Prerequisites

| Tool | Why | Install |
| --- | --- | --- |
| **Bun** ≥ 1.1 | Runtime + package manager for the app | <https://bun.sh> |
| **Node.js** ≥ 20 | Runs the MongoDB gateway (`mongo-api/`) | <https://nodejs.org> |
| **Git** | Clone the repo | <https://git-scm.com> |

External accounts you'll need API keys for:

| Service | Purpose | Free tier? |
| --- | --- | --- |
| **Supabase** | Auth (sign-up / sign-in / sessions) | Yes |
| **TMDB** | Movie & series metadata, trailers, "where to watch" | Yes |
| **Google Gemini** | AI learning assistant chat | Yes |
| **MongoDB Atlas** | App database (profiles, classes, assignments, lists, etc.) | Yes (M0) |
| **Resend** | Email notifications for class invitations | Yes (100/day) — optional |

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/moimeme28/eduflixx.git
cd eduflixx
```

### 2. Install app dependencies

```bash
bun install
```

> If you prefer npm, run `npm install` instead — `.npmrc` already sets `legacy-peer-deps=true` to resolve the `zod` v3/v4 peer-dep conflict.

### 3. Start the MongoDB gateway (required)

The app cannot reach MongoDB Atlas directly (Cloudflare Workers can't open TCP sockets), so the gateway must be running **before** you start the app.

**Windows (easiest):**

```cmd
cd mongo-api
start-gateway.bat
```

The batch file sets `MONGODB_URI`, `MONGODB_DB`, `MONGO_API_KEY`, and `PORT=8787` for you, then runs `npm start`.

**macOS / Linux / manual:**

```bash
cd mongo-api
npm install
MONGODB_URI="mongodb+srv://..." \
MONGODB_DB="eduflix" \
MONGO_API_KEY="your-shared-secret" \
PORT=8787 \
npm start
```

Wait for a line like `[mongo-api] listening on :8787`, then verify:

```bash
curl http://localhost:8787/health
# → {"ok":true,...}
```

### 4. Configure environment variables

Create a `.env` file in the project root (copy `.env.example` and fill in your values):

```bash
# ── Supabase (auth) ──────────────────────────────────────────
# From your Supabase project: Settings → API
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-anon-key"
# Server-only — needed for admin actions (role assignment). Settings → API → service_role.
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# ── TMDB (movie/series data, trailers, watch providers) ─────
# Get a free key at https://www.themoviedb.org/settings/api
TMDB_API_KEY="your-tmdb-api-key"

# ── Google Gemini (AI learning assistant) ───────────────────
# Get a free key at https://aistudio.google.com/apikey
LOVABLE_API_KEY="your-gemini-api-key"

# ── Mongo API gateway (data layer) ──────────────────────────
# The local gateway from step 3, or your deployed gateway URL
MONGO_API_URL="http://localhost:8787"
MONGO_API_KEY="your-shared-secret"   # must match the gateway's MONGO_API_KEY

# ── Resend (class invitation emails — optional) ─────────────
# Without this, class invites still work (auto-join on sign-in) but no email is sent.
# Sign up at https://resend.com — free tier is 100 emails/day.
RESEND_API_KEY="your-resend-api-key"
```

> **Important:** `MONGO_API_KEY` must be the **same value** on both the app and the gateway — it's the shared secret that authenticates requests between them.

### 5. Start the app

**Windows (easiest):**

```cmd
start-app.bat
```

**Any OS:**

```bash
bun dev
```

Open **http://localhost:8080** — you should see the home page with featured content.

> **Password requirements:** When creating an account, passwords must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character. A live strength meter is shown on the sign-up form.

### 6. Quick smoke test

| What to try | Expected result |
| --- | --- |
| Visit `http://localhost:8787/health` | `{"ok":true}` (gateway is up) |
| Visit `http://localhost:8080` | Home page loads with featured content |
| Sign up at `/auth` | Account created, redirected to home |
| Ask the AI assistant a question | It searches TMDB and responds with recommendations |
| Browse `/classroom` | Classes and assignments load from MongoDB |

## Environment variables

### App (`.env` in project root)

| Variable | Required? | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Supabase service-role key — used in server functions for admin actions |
| `TMDB_API_KEY` | Yes | API key from [TMDB](https://www.themoviedb.org/settings/api) |
| `LOVABLE_API_KEY` | Yes | Google Gemini API key (powers AI chat) |
| `MONGO_API_URL` | Yes | URL of the `mongo-api` gateway (local or deployed) |
| `MONGO_API_KEY` | Yes | Shared secret between app and gateway |
| `RESEND_API_KEY` | Optional | Resend API key for class invitation emails (invites work without it) |

### Mongo API gateway (`mongo-api/`)

| Variable | Required? | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `MONGODB_DB` | No | Database name (default: `eduflix`) |
| `MONGO_API_KEY` | Yes | Shared secret — must match the app's `MONGO_API_KEY` |
| `PORT` | No | Listen port (default: `8787`) |

## Deployment

The project is two separate services. **Deploy the gateway first** so you have a public `MONGO_API_URL` for the app.

> **One-click option:** This repo includes a `render.yaml` blueprint. In Render, go to **New → Blueprint**, connect the repo, and Render creates both services at once. You just fill in the env vars marked `sync: false`.

### A. Deploy the MongoDB gateway

Deploy the `mongo-api/` folder to any Node host:

| Setting | Value |
| --- | --- |
| Root directory | `mongo-api` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check | `GET /health` |

**Environment variables on the host:**

- `MONGODB_URI` — your Atlas connection string
- `MONGODB_DB` — `eduflix`
- `MONGO_API_KEY` — a strong secret (e.g. `openssl rand -hex 32`)
- `PORT` — most hosts assign this automatically (leave unset on Render/Railway)

**Render quick setup:**

1. <https://render.com> → New → **Web Service** → connect `moimeme28/eduflixx`
2. Root directory: `mongo-api` · Build: `npm install` · Start: `npm start`
3. Add the env vars above → Deploy
4. Note the URL (e.g. `https://eduflix-api.onrender.com`)
5. Verify: visit `https://<your-gateway-url>/health` → `{"ok":true}`

**Railway / Fly / any Node host:** same build/start commands and env vars.

### B. Deploy the app

The app builds with Nitro. By default, `vite.config.ts` sets the Nitro preset to `node-server` so the build outputs a standard Node server at `.output/server/index.mjs`. This runs on any Node host.

**Build:**

```bash
bun run build
```

This outputs to `.output/`. The server entry is `.output/server/index.mjs`.

> **Cloudflare Workers?** Set `NITRO_PRESET=cloudflare-module` during build to target Workers instead of Node.

**Option 1 — Render / Railway / Fly (Node server — default):**

| Setting | Value |
| --- | --- |
| Root directory | *(project root)* |
| Build command | `npm install && npm run build` |
| Start command | `node .output/server/index.mjs` |

Set all the env vars from the [App](#app-env-in-project-root) table, using your deployed gateway URL for `MONGO_API_URL` and the same `MONGO_API_KEY` as the gateway.

**Option 2 — Cloudflare Workers:**

1. Build with the Cloudflare preset: `NITRO_PRESET=cloudflare-module bun run build`
2. Install Wrangler: `npm install -g wrangler`
3. Login: `wrangler login`
4. Create `wrangler.toml` at the project root:

   ```toml
   name = "eduflix"
   compatibility_date = "2024-11-01"
   main = ".output/server/index.mjs"
   assets = { directory = ".output/public", binding = "ASSETS" }
   ```

5. Set each secret (paste the value when prompted):

   ```bash
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_PUBLISHABLE_KEY
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put TMDB_API_KEY
   wrangler secret put LOVABLE_API_KEY
   wrangler secret put MONGO_API_URL       # your deployed gateway URL
   wrangler secret put MONGO_API_KEY       # same secret as the gateway
   wrangler secret put RESEND_API_KEY
   ```

6. Deploy: `wrangler deploy`

### C. Post-deploy checklist

1. Verify the gateway: `https://<gateway-url>/health` → `{"ok":true}`
2. Visit the app URL — home page should load
3. In Supabase: add your deployed app URL to **Auth → URL Configuration → Redirect URLs**
4. Sign up, then try the AI assistant and `/classroom` to confirm data flows end-to-end

## Project structure

```text
src/
  components/       UI components (Navbar, Rail, TitleCard, AssistantChat, etc.)
  hooks/            React hooks (auth, favorites, role, mobile)
  integrations/     Supabase client
  lib/              Server functions, data layer, email helper, utilities
  routes/           TanStack file-based routes
  styles.css        Tailwind v4 theme and global styles

mongo-api/
  server.js         Express HTTPS gateway to MongoDB Atlas
  migrate.js        Postgres → MongoDB migration script
  README.md         Gateway-specific docs

.npmrc              legacy-peer-deps=true (npm compatibility with Bun's loose peer deps)
```

## Key routes

| Route | Description |
| --- | --- |
| `/` | Home with featured pick, trending docs, series and subjects |
| `/subjects` | Browse all subjects |
| `/subject/:slug` | Subject page with topic filters |
| `/title/:type/:id` | Movie / series detail page |
| `/search` | Search titles |
| `/auth` | Sign in / sign up (password strength meter on sign-up) |
| `/dashboard` | Saved watchlist with study notes |
| `/lists` | My curated learning lists (authenticated) |
| `/lists/:id` | Public list detail |
| `/community` | Discover public lists and creators |
| `/users/:id` | Public profile and lists for a user |
| `/assistant` | AI learning assistant conversations |
| `/classroom` | Teacher/student classes and assignments |
| `/admin` | Admin panel for users, roles and classrooms |
| `/api/public/mongo-diag` | Connection diagnostic: app → gateway → MongoDB |


## Data model (MongoDB)

Collections managed through the gateway:

- `profiles`
- `user_roles`
- `classes`
- `class_members`
- `class_invites`
- `assignments`
- `assignment_progress`
- `favorites`
- `assistant_threads`
- `assistant_messages`
- `lists`
- `list_items`
- `follows`

Authentication itself stays in Supabase Auth. The gateway is only reached from server functions, which enforce ownership rules before querying MongoDB.


## Scripts

| Command | Description |
| --- | --- |
| `bun dev` | Start the Vite dev server |
| `bun run build` | Production build |
| `bun run test` | Run Vitest tests |
| `bun run lint` | Run ESLint |
| `bun run format` | Format with Prettier |

## License

MIT
