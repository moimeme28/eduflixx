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
- **Classrooms** — Teachers can create classes, invite students, build playlists and assign titles; students track assignment progress.
- **Admin controls** — First user can claim admin access, then manage roles, users, classes and assignments.


## Recent improvements

- Title pages get streaming availability per region (auto-detected from the browser locale, falling back to US or any region with listings).
- Trailer lookup uses ranked video scoring and multi-stage fallbacks instead of a single query.
- Role assignment during signup is now repaired on sign-in — teacher accounts created with the wrong role are fixed automatically.
- The Mongo gateway opens connections lazily and stays healthy even when Atlas credentials are temporarily wrong, plus a root status endpoint (`/`) and a diagnostic route (`/api/public/mongo-diag`) in the app.
- The Back button on title pages returns to the previous page in the viewer's history instead of always going home.
- Social study clubs: public and private learning lists, user following, community discovery, and "Add to list" actions on titles.


## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start v1 (React 19 + Vite) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + Radix |
| Auth | Lovable Cloud (Supabase Auth) — email/password + Google OAuth |
| App data | MongoDB Atlas |
| Movie data | TMDB API |
| AI | Lovable AI Gateway via `ai-sdk` |
| Hosting | Cloudflare Workers (app) + Render/Railway/Fly (Mongo gateway) |

## Why MongoDB via a gateway?

The app runs on Cloudflare Workers, which cannot open raw TCP sockets. The native MongoDB driver needs a TCP connection, so a small companion Express service (`mongo-api/`) acts as an HTTPS bridge between the app and MongoDB Atlas. The app calls this gateway from server functions only; it is never exposed to the browser.

## Getting started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Create or update `.env` with the values Lovable Cloud provides, plus your external API keys:

```bash
# Lovable Cloud / Supabase (auth)
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...

# TMDB (movie data)
TMDB_API_KEY=...

# Mongo API gateway (data layer)
MONGO_API_URL=https://your-gateway.onrender.com
MONGO_API_KEY=...
```

### 3. Run the dev server

```bash
bun dev
```

Open `http://localhost:8080`.

### 4. Run the Mongo API gateway locally (optional)

If you are using the Mongo data layer, start the companion service:

```bash
cd mongo-api
npm install
MONGODB_URI="mongodb+srv://..." \
MONGO_API_KEY="$(openssl rand -hex 32)" \
npm start
```

Then set `MONGO_API_URL=http://localhost:8787` in the app `.env`.

## Environment variables

### App (Lovable / local `.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Lovable Cloud / Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon key |
| `TMDB_API_KEY` | API key from [TMDB](https://www.themoviedb.org/settings/api) |
| `MONGO_API_URL` | HTTPS endpoint of the `mongo-api` service |
| `MONGO_API_KEY` | Shared secret between app and gateway |

### Mongo API gateway (Render / Railway / Fly)

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB` | Database name (default: `eduflix`) |
| `MONGO_API_KEY` | Same shared secret as above |
| `PORT` | Listen port (default: `8787`) |

## Deployment

1. **App**: Deploy through Lovable. Lovable Cloud handles auth; external secrets are added in project settings.
2. **Mongo gateway**: Deploy the `mongo-api/` folder to Render, Railway or Fly.
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check: `GET /health`
3. After the gateway is live, add `MONGO_API_URL` and `MONGO_API_KEY` to the Lovable app secrets.

## Project structure

```text
src/
  components/       UI components (Navbar, Rail, TitleCard, AssistantChat, etc.)
  hooks/            React hooks (auth, favorites, role, mobile)
  integrations/     Lovable Cloud and Supabase clients
  lib/              Server functions, data layer, utilities
  routes/           TanStack file-based routes
  styles.css        Tailwind v4 theme and global styles

mongo-api/
  server.js         Express HTTPS gateway to MongoDB Atlas
  migrate.js        Postgres → MongoDB migration script
  README.md         Gateway-specific docs
```

## Key routes

| Route | Description |
| --- | --- |
| `/` | Home with featured pick, trending docs, series and subjects |
| `/subjects` | Browse all subjects |
| `/subject/:slug` | Subject page with topic filters |
| `/title/:type/:id` | Movie / series detail page |
| `/search` | Search titles |
| `/auth` | Sign in / sign up |
| `/dashboard` | Saved watchlist with study notes |
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

Authentication itself stays in Lovable Cloud / Supabase Auth. The gateway is only reached from server functions, which enforce ownership rules before querying MongoDB.

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
