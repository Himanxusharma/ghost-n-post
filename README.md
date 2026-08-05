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

- **App:** Next.js 15 (App Router) + TypeScript, Tailwind CSS
- **Background jobs:** Inngest (durable step functions — no Redis/Celery)
- **Video/caption extraction:** `youtubei.js` (pure JS, no external binary)
- **Transcription fallback:** Deepgram or AssemblyAI (URL-based, no local
  audio processing)
- **LLM generation:** Claude API (Anthropic SDK)
- **Database:** Neon Postgres via the Vercel Postgres integration + Drizzle ORM
- **Storage:** Vercel Blob (thumbnails, transcripts)
- **Auth:** Clerk
- **Rate limiting:** Upstash Redis + `@upstash/ratelimit`
- **Hosting:** Vercel (single project — frontend, API, and jobs all included)

See `TRD.md` for full architecture and `SKILLS.md` for the detailed tech
breakdown per component.

## Project Docs

| Doc | Purpose |
|---|---|
| `PRD.md` | Product Requirements — problem, users, goals, features, success metrics |
| `FRD.md` | Functional Requirements — detailed feature specs, user flows, UI behavior |
| `TRD.md` | Technical Requirements — architecture, data flow, APIs, infra |
| `SKILLS.md` | Tech stack & skills required to build and maintain the product |

## Getting Started (local dev)

```bash
# Install dependencies (one package.json for the whole app)
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Run the app locally
npm run dev

# Run Inngest's local dev server in a second terminal (for background job testing)
npx inngest-cli@latest dev
```

That's it — no second service, no Docker Compose, no separate worker
process to start.

### Environment Variables

```
ANTHROPIC_API_KEY=
DATABASE_URL=              # Neon Postgres connection string
BLOB_READ_WRITE_TOKEN=     # Vercel Blob
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
DEEPGRAM_API_KEY=          # or ASSEMBLYAI_API_KEY
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Deployment

Deploy the repo to Vercel as a single project. Connect the Neon Postgres,
Vercel Blob, and Inngest integrations from the Vercel dashboard (or via
`vercel env pull` after setting them up), set the environment variables
above, and push to `main`. One deploy, everything included.

## Status

Early-stage concept / MVP planning. See `PRD.md` for roadmap and phased
scope.

## License

TBD.
