# Ghost n Post

Video in. Voice out. Paste a YouTube link and walk away with LinkedIn or X
drafts that sound like you wrote them.

## What it does

1. Paste a YouTube link and choose platforms (LinkedIn, X, or both).
2. We pull the transcript (captions or speech-to-text), extract the video's
   thumbnail, and analyze the content.
3. We generate platform-ready drafts, optionally matched to your writing
   style using sample posts you provide.
4. You review, format, edit, export, or publish / schedule.

## Why

Creators and founders publish YouTube content but rarely repurpose it into
text posts. It's manual, slow, and the result doesn't sound like them.
Ghost n Post automates the video → transcript → post pipeline and adds a
style-matching layer so output doesn't read like generic AI copy.

## Core Features

- YouTube link → auto-fetched thumbnail (download + branded custom thumb)
- Automatic transcript extraction (captions first, Deepgram STT fallback)
- LLM-generated LinkedIn and/or X drafts (platform checkboxes)
- Unicode-safe draft formatting (bold/italic/etc. that pastes into LinkedIn/X)
- Voice-matching via sample posts (style profile, reusable)
- X thread splitting for long-form insight
- Publish / schedule to LinkedIn & X, history, batch/channel, analytics, teams
- Chrome extension companion (`extension/`)
- Dark tactile-brutalist UI, responsive layouts, loading skeletons
- Branded favicon / tab icon (lime **G** monogram)

## Architecture: One App, One Deploy

Ghost n Post is a **single Next.js application**: frontend, API, and
background job processing all live in one repo and deploy to **one Vercel
project**. There is no separate backend service, no queue/broker, and no
worker fleet to host or keep alive elsewhere.

```
Next.js (App Router)
 ├─ Pages: home draft studio + secondary screens (history, batch, …)
 ├─ Route Handlers (/app/api/*): validation, auth, data access
 └─ Inngest functions (/app/api/inngest): durable multi-step
    background pipeline (metadata → transcript → generation → save)
```

## Tech Stack (short version)

- **App:** Next.js 16 (App Router) + TypeScript, Tailwind CSS
- **Background jobs:** Inngest (durable step functions, no Redis/Celery)
- **Video/caption extraction:** `youtubei.js` (pure JS, no external binary)
- **Transcription fallback:** Deepgram (URL-based, no local audio processing)
- **LLM generation:** Groq (`llama-3.3-70b-versatile` by default)
- **Database:** Neon Postgres via the Vercel Postgres integration + Drizzle ORM
- **Storage:** Vercel Blob (thumbnails, transcripts)
- **Auth:** Clerk (Google OAuth only)
- **Rate limiting:** Upstash Redis + `@upstash/ratelimit`
- **Hosting:** Vercel (single project: frontend, API, and jobs all included)

See `Docs/TRD.md` for full architecture and `Docs/SKILLS.md` for the detailed tech
breakdown per component.

## Project Docs

| Doc | Purpose |
|---|---|
| `Docs/PRD.md` | Product Requirements: problem, users, goals, features, success metrics |
| `Docs/FRD.md` | Functional Requirements: detailed feature specs, user flows, UI behavior |
| `Docs/TRD.md` | Technical Requirements: architecture, data flow, APIs, infra |
| `Docs/SKILLS.md` | Tech stack & skills required to build and maintain the product |

## Getting Started (local dev)

```bash
# Install dependencies (one package.json for the whole app)
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in real values for Groq, Neon, Blob, Inngest, Deepgram, Clerk, Upstash

# Push the Drizzle schema to Neon
npm run db:push

# Run the app (match port with NEXT_PUBLIC_APP_URL + inngest:dev)
npm run dev -- -p 3010

# Run Inngest's local dev server in a second terminal
npm run inngest:dev
```

`inngest:dev` targets `http://localhost:3010/api/inngest`. If you use another
port, update that script and `NEXT_PUBLIC_APP_URL` to match.

That's it. No second service, no Docker Compose, no separate worker
process to start.

### Environment Variables

```
GROQ_API_KEY=              # https://console.groq.com/keys
GROQ_MODEL=                # optional; default llama-3.3-70b-versatile
DATABASE_URL=              # Neon Postgres connection string
BLOB_READ_WRITE_TOKEN=     # Vercel Blob
INNGEST_DEV=1              # local only; omit in production
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
DEEPGRAM_API_KEY=            # optional but recommended for caption-less videos
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
NEXT_PUBLIC_APP_URL=http://localhost:3010
OAUTH_STATE_SECRET=          # optional; defaults to CLERK_SECRET_KEY
LINKEDIN_CLIENT_ID=          # publish / schedule
LINKEDIN_CLIENT_SECRET=
X_CLIENT_ID=
X_CLIENT_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Authentication (Clerk, Google only)

1. Create an app in the [Clerk dashboard](https://dashboard.clerk.com).
2. Copy the publishable + secret keys into `.env.local`.
3. In Clerk → **User & authentication → Social connections**, enable **Google** only.
4. Disable email/password and any other social providers so Google is the sole method.
5. In Clerk → Configure → Paths, set sign-in `/sign-in` and sign-up `/sign-up`.
6. Allow `http://localhost:3010` (and your production domain) as origins / redirect URLs.
7. After first Google sign-in, `AuthSync` calls `GET /api/me` to upsert your Neon `users` row.

The app UI only offers **Continue with Google** (custom OAuth via `/sso-callback`). Protected pages redirect unsigned visitors to `/sign-in`; protected APIs return JSON `401`.

## Deployment (Vercel)

Deploy the repo to Vercel as a single project. Connect Neon Postgres,
Vercel Blob, and Inngest from the Vercel dashboard, set env vars, deploy.

**Do not set `INNGEST_DEV` in production.**

**Production required env** (boot fails closed if missing):

- `DATABASE_URL`, `GROQ_API_KEY`, `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_APP_URL` (canonical https origin; also used for OAuth + SEO)

Optional: `DEEPGRAM_API_KEY`, LinkedIn/X OAuth keys, `OAUTH_STATE_SECRET`, `GROQ_MODEL`.

After first prod deploy, push schema once:

```bash
DATABASE_URL="your-prod-neon-url" npm run db:push
```

For publishing, register LinkedIn and X developer apps and set callbacks to:

- `{NEXT_PUBLIC_APP_URL}/api/social/linkedin/callback`
- `{NEXT_PUBLIC_APP_URL}/api/social/x/callback`

Also allow your production origin in the Clerk dashboard (Google OAuth) and
sync Inngest with the deployed `/api/inngest` route.

## Status (Version 2.2 — Production Verified)

Phase 1 to 4 implemented, build-hardened, and visually verified:

- Phase 1: generate pipeline, style matching, history
- Phase 2: LinkedIn/X publish, scheduling, carousel images
- Phase 3: Chrome extension, batch/channel mode, analytics
- Phase 4: multi-language drafts, team workspaces, custom thumbnails
- Build & UX: Vercel production build hardened (`npm run build` verified), strict TypeScript handler safety, responsive Tactile Brutalist design system (`globals.css` design tokens, mobile/tablet/desktop verified)

Configure `.env.local` and run `npm run db:push` before exercising the full
flow. Load the unpacked extension from `extension/` (see
`extension/README.md`).

## Phase 3 quick start

```bash
# App
npm run dev -- -p 3010
npm run inngest:dev

# Extension
# 1) Visit /extension and create a token
# 2) chrome://extensions → Load unpacked → ./extension
# 3) Set API base URL + token in extension options
```

Batch channel/URL jobs live at `/batch`. Performance dashboard is at
`/analytics` (X public metrics sync hourly + on demand; LinkedIn member
analytics are partner-gated).

## Phase 4 quick start

- Homepage language selector controls STT + generation language (`auto`
  detects from transcript).
- `/team`: create a workspace, invite by email link, set active team
  (new generations attach to the active team).
- Post results → **Generate branded thumbnail** (Groq headline + OG image
  to Blob); optionally attach on publish.

After pulling schema changes, run:

```bash
npm run db:push
```

## License

TBD.
