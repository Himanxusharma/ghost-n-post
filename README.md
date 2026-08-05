# Ghost n Post

Your AI ghostwriter for video. Turn any YouTube video into a ready-to-publish
LinkedIn or X post — in your own voice.

## What it does

1. Paste a YouTube link.
2. We pull the transcript (captions or speech-to-text), extract the video's
   thumbnail, and analyze the content.
3. We generate a platform-ready post (LinkedIn or X) — optionally matched
   to your writing style using sample posts you provide.
4. You review, edit, and export or publish.

## Why

Creators and founders publish YouTube content but rarely repurpose it into
text posts — it's manual, slow, and the result doesn't sound like them.
Ghost n Post automates the video → transcript → post pipeline and adds a
style-matching layer so output doesn't read like generic AI copy.

## Core Features

- YouTube link → auto-fetched thumbnail (no upload needed)
- Automatic transcript extraction (captions first, STT fallback)
- LLM-generated LinkedIn and X post drafts (multiple variants)
- Voice-matching via user-submitted sample posts (style profile, reusable)
- X thread splitting for long-form insight
- Minimal, distraction-free UI — one input, one output, no dashboard clutter

## Architecture: One App, One Deploy

Ghost n Post is a **single Next.js application** — frontend, API, and
background job processing all live in one repo and deploy to **one Vercel
project**. There is no separate backend service, no queue/broker, and no
worker fleet to host or keep alive elsewhere.

```
Next.js (App Router)
 ├─ Pages: minimalist single-page flow
 ├─ Route Handlers (/app/api/*): validation, auth, data access
 └─ Inngest functions (/app/api/inngest): durable multi-step
    background pipeline (metadata → transcript → generation → save)
```

## Tech Stack (short version)

- **App:** Next.js 16 (App Router) + TypeScript, Tailwind CSS
- **Background jobs:** Inngest (durable step functions — no Redis/Celery)
- **Video/caption extraction:** `youtubei.js` (pure JS, no external binary)
- **Transcription fallback:** Deepgram (URL-based, no local audio processing)
- **LLM generation:** Groq (`llama-3.3-70b-versatile` by default)
- **Database:** Neon Postgres via the Vercel Postgres integration + Drizzle ORM
- **Storage:** Vercel Blob (thumbnails, transcripts)
- **Auth:** Clerk
- **Rate limiting:** Upstash Redis + `@upstash/ratelimit`
- **Hosting:** Vercel (single project — frontend, API, and jobs all included)

See `Docs/TRD.md` for full architecture and `Docs/SKILLS.md` for the detailed tech
breakdown per component.

## Project Docs

| Doc | Purpose |
|---|---|
| `Docs/PRD.md` | Product Requirements — problem, users, goals, features, success metrics |
| `Docs/FRD.md` | Functional Requirements — detailed feature specs, user flows, UI behavior |
| `Docs/TRD.md` | Technical Requirements — architecture, data flow, APIs, infra |
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

# Run the app locally
npm run dev

# Run Inngest's local dev server in a second terminal (for background job testing)
npm run inngest:dev
```

That's it — no second service, no Docker Compose, no separate worker
process to start.

### Environment Variables

```
GROQ_API_KEY=              # https://console.groq.com/keys
GROQ_MODEL=                # optional; default llama-3.3-70b-versatile
DATABASE_URL=              # Neon Postgres connection string
BLOB_READ_WRITE_TOKEN=     # Vercel Blob
INNGEST_DEV=1              # local only — omit in production
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
DEEPGRAM_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
NEXT_PUBLIC_APP_URL=http://localhost:3000
LINKEDIN_CLIENT_ID=        # Phase 2 publish
LINKEDIN_CLIENT_SECRET=
X_CLIENT_ID=               # Phase 2 publish
X_CLIENT_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Authentication (Clerk — Google only)

1. Create an app in the [Clerk dashboard](https://dashboard.clerk.com).
2. Copy the publishable + secret keys into `.env.local`.
3. In Clerk → **User & authentication → Social connections**, enable **Google** only.
4. Disable email/password and any other social providers so Google is the sole method.
5. In Clerk → Configure → Paths, set sign-in `/sign-in` and sign-up `/sign-up`.
6. Allow `http://localhost:3000` (and your production domain) as origins / redirect URLs.
7. After first Google sign-in, `AuthSync` calls `GET /api/me` to upsert your Neon `users` row.

The app UI only offers **Continue with Google** (custom OAuth via `/sso-callback`). Protected pages redirect unsigned visitors to `/sign-in`; protected APIs return JSON `401`.

## Deployment

Deploy the repo to Vercel as a single project. Connect the Neon Postgres,
Vercel Blob, and Inngest integrations from the Vercel dashboard (or via
`vercel env pull` after setting them up), set the environment variables
above, and push to `main`. One deploy, everything included.

**Production required env** (boot fails closed if missing):

- `DATABASE_URL`, `GROQ_API_KEY`, `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_APP_URL` (canonical https origin; also used for OAuth + SEO)

Optional: `DEEPGRAM_API_KEY`, LinkedIn/X OAuth keys, `OAUTH_STATE_SECRET`.

For Phase 2 publishing, register LinkedIn and X developer apps and set the
OAuth callback URLs to:

- `{NEXT_PUBLIC_APP_URL}/api/social/linkedin/callback`
- `{NEXT_PUBLIC_APP_URL}/api/social/x/callback`

Also allow your production origin in the Clerk dashboard (Google OAuth).

## Status

Phase 1–4 implemented:

- Phase 1: generate pipeline, style matching, history
- Phase 2: LinkedIn/X publish, scheduling, carousel images
- Phase 3: Chrome extension, batch/channel mode, analytics
- Phase 4: multi-language drafts, team workspaces, custom thumbnails

Configure `.env.local` and run `npm run db:push` before exercising the full
flow. Load the unpacked extension from `extension/` (see
`extension/README.md`).

## Phase 3 quick start

```bash
# App
npm run dev
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

- Homepage language selector controls STT + Claude output language (`auto`
  detects from transcript).
- `/team` — create a workspace, invite by email link, set active team
  (new generations attach to the active team).
- Post results → **Generate branded thumbnail** (Claude headline + OG image
  to Blob); optionally attach on publish.

After pulling Phase 4 schema changes, run:

```bash
npm run db:push
```

## License

TBD.
