# Technical Requirements Document (TRD)

**Product:** Ghost n Post
**Version:** 2.0 (MVP — Single-Deploy Vercel Architecture)

---

## 1. Architecture Overview

One Next.js application. One Vercel deployment. No separate backend service, no
self-managed queue/worker infra. Everything below lives in **one repo**.

```
                        ┌─────────────────────────────────────────┐
                        │              Next.js App (Vercel)         │
                        │                                            │
  User ── URL ────────▶ │  App Router Pages  +  Route Handlers      │
                        │  (/app, /app/api/*)                       │
                        │                                            │
                        │  ┌──────────────┐   ┌────────────────┐   │
                        │  │ Inngest funcs │──▶│ Claude API call │   │
                        │  │ (durable job  │   │ (post drafts +  │   │
                        │  │  pipeline)    │   │  style profile) │   │
                        │  └──────┬───────┘   └────────────────┘   │
                        └─────────┼──────────────────────────────────┘
                                  │
              ┌───────────────────┼────────────────────┐
              ▼                   ▼                    ▼
     ┌────────────────┐  ┌────────────────┐   ┌──────────────────┐
     │ Neon Postgres   │  │ Vercel Blob    │   │ Deepgram / Assembly│
     │ (Vercel Postgres)│  │ (thumbnails,   │   │ AI (STT fallback,  │
     │ users, videos,   │  │  transcripts)  │   │  URL-based, no      │
     │ posts, jobs,     │  │                │   │  audio download)    │
     │ style_profiles   │  │                │   │                     │
     └────────────────┘  └────────────────┘   └──────────────────┘
```

**Key shift from v1.0:** FastAPI + Celery + Redis + separate worker containers
are replaced by **Inngest** — a durable-function orchestrator that runs as
serverless functions inside the same Next.js deployment. It gives us
multi-step, retryable, long-running background jobs (the thing Celery was
for) without hosting a second service, a queue, or workers anywhere.

---

## 2. Component Breakdown

### 2.1 Application (single app, single repo)
- **Framework:** Next.js 15 (App Router), TypeScript throughout — frontend
  pages and backend API routes live in the same project.
- **Styling:** Tailwind CSS — restrained, single-accent-color palette per the
  minimalist UI philosophy.
- **State/data fetching:** React Query for polling job status; no global
  store needed for an input → output flow.
- **Deployment:** Vercel, single project, single `vercel deploy`. Preview
  deployments per PR come free with this setup.

### 2.2 API Layer
- Next.js **Route Handlers** (`app/api/**/route.ts`) replace the FastAPI
  service. Same responsibilities: request validation, auth checks, kicking
  off jobs, serving post/history data.
- Runs on Vercel's Node.js serverless runtime (not Edge) where we need
  Node-only libraries (DB drivers, Anthropic SDK).

### 2.3 Background Jobs — Inngest (replaces Celery + Redis)
- **Why:** Vercel serverless functions have execution time limits per
  invocation. A single "process this video" job needs multiple steps
  (fetch metadata → get transcript → call Claude → persist) that can
  individually take seconds to a couple of minutes. Inngest breaks a job
  into durable **steps**, each its own short-lived function invocation,
  automatically retried on failure, with state persisted between steps —
  no Redis broker or long-running worker process required.
- Deployed as a single route handler (`app/api/inngest/route.ts`) that
  Inngest's cloud (free tier available) calls to execute steps. Still one
  deployable artifact — the Next.js app.
- Pipeline steps: `fetch-metadata` → `get-transcript` → `generate-posts` →
  `persist-result`. Each step writes progress to the `jobs` table so the
  frontend can poll granular stage labels.
- **Alternative considered:** Trigger.dev or Upstash QStash + Workflow —
  either works; Inngest is recommended for its step-function DX and
  generous free tier for MVP scale.

### 2.4 Video Metadata & Caption Extraction
- **Tool:** `youtubei.js` (pure JavaScript/TypeScript, no external binary,
  no ffmpeg) — replaces `yt-dlp`, which is a Python binary that doesn't run
  reliably on Vercel's serverless runtime.
- Fetches: title, channel, duration, thumbnail URL(s), and existing
  captions (auto-generated or creator-provided) directly.
- Runs entirely inside a Node.js serverless function / Inngest step — no
  container, no persistent process.

### 2.5 Transcription Fallback (no captions available)
- **Primary:** captions via `youtubei.js` (free, instant).
- **Fallback:** Deepgram or AssemblyAI, both of which accept a **remote
  audio/video URL directly** — we pass the extracted audio stream URL
  (resolved via `youtubei.js`) and let the STT provider pull and transcribe
  it. This avoids downloading/processing audio ourselves, which is the part
  that made `yt-dlp` + Whisper hard to run serverless.
- Output: timestamped transcript, stored as a text object in **Vercel
  Blob**, referenced by key in Postgres (not stored as a large text column).

### 2.6 Post Generation (LLM Layer)
- **Model:** Claude API (Sonnet-class model), called directly from an
  Inngest step using the Anthropic Node SDK.
- **Prompt structure:** unchanged in spirit —
  - System prompt: platform formatting rules (LinkedIn long-form vs. X
    short-form/thread) + style-profile injection.
  - User content: cleaned transcript, map-reduced/summarized first if the
    video is long, to stay within context and control cost.
- **Style matching:**
  - MVP: few-shot — inject the user's saved sample posts into the prompt.
  - Style profile (tone, structure, length pattern, formatting habits) is
    extracted once via a single Claude call when the user submits samples,
    then reused on every generation — cheaper and more consistent than
    re-sending raw samples each time.
- Output requested as structured JSON (LinkedIn post, X post, X thread
  array) via structured-output prompting; parsed and validated with Zod
  before persisting.

### 2.7 Database
- **Neon Postgres** via the Vercel Postgres integration (serverless
  Postgres — scales to zero, connects natively from serverless functions
  via HTTP driver, no connection-pool headaches).
- **ORM:** Drizzle ORM — lightweight, TypeScript-first, works cleanly in
  serverless/edge contexts.
- Core tables unchanged in concept: `users`, `videos`, `jobs`, `posts`,
  `style_profiles`. Large text (transcripts) stays out of Postgres —
  reference Blob keys instead.

### 2.8 Storage
- **Vercel Blob** replaces the generic S3-compatible bucket — native to the
  Vercel platform, no separate account/credentials to manage. Stores
  thumbnails and transcripts. Signed, expiring URLs for access.
- No temp audio files are stored — STT providers pull audio directly from
  the resolved stream URL, so there's nothing to clean up.

### 2.9 Auth
- **Clerk** — drop-in auth for Next.js, handles email/OAuth, ships
  first-class Vercel/Next.js middleware support. (Supabase Auth remains a
  fine alternative if you'd rather consolidate on Supabase for DB+auth
  instead of Neon+Clerk — see §7.)

### 2.10 Rate Limiting
- **Upstash Redis + `@upstash/ratelimit`** — serverless Redis, pay-per-request,
  no server to run. Used only for rate-limiting `/api/generate` per user;
  it is *not* a job queue (Inngest owns that role now).

### 2.11 Job Status Updates to the Frontend
- Frontend polls `GET /api/jobs/{id}` via React Query (simplest, matches
  the "no unnecessary complexity" UI philosophy). Each poll returns the
  current stage label written by the Inngest step in progress
  ("Fetching video…", "Transcribing…", "Writing draft…").
- SSE is a viable post-MVP upgrade but isn't required to hit the <90s
  target with simple polling.

---

## 3. Data Flow (Step-by-Step)

1. Frontend submits YouTube URL → `POST /api/generate`.
2. Route handler validates the URL and rate limit, creates a `job` row,
   and triggers an Inngest event (`video.generate.requested`).
3. Frontend immediately starts polling `GET /api/jobs/{id}`.
4. Inngest step `fetch-metadata`: `youtubei.js` pulls title, duration,
   channel, thumbnail → thumbnail uploaded to Vercel Blob → job stage
   updated to `transcribing`.
5. Inngest step `get-transcript`: captions via `youtubei.js`; if absent,
   Deepgram/AssemblyAI transcribes from the resolved audio URL → transcript
   text uploaded to Vercel Blob → job stage updated to `writing`.
6. Inngest step `generate-posts`: builds the prompt (transcript + style
   profile if saved) → calls Claude API → validates structured JSON output.
7. Inngest step `persist-result`: writes the `posts` row, marks job
   `complete`.
8. Frontend's next poll sees `complete`, fetches `GET /api/posts/{id}`,
   renders thumbnail + LinkedIn/X drafts side by side.

---

## 4. Key API Endpoints (MVP)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/generate` | Submit YouTube URL, triggers Inngest job |
| GET | `/api/jobs/{id}` | Poll job status/stage |
| GET | `/api/posts/{id}` | Fetch generated post result |
| POST | `/api/style-profile` | Submit sample posts, generate/update style profile |
| GET | `/api/style-profile` | Fetch current user's style profile |
| GET | `/api/history` | List past generations for logged-in user |
| DELETE | `/api/history/{id}` | Delete a history entry |
| POST/GET | `/api/inngest` | Inngest's internal step-invocation endpoint (not user-facing) |

---

## 5. Non-Functional Requirements

- **Performance:** End-to-end target < 90s for a 10–20 min video with
  existing captions; < 3 min if STT fallback is required — unchanged from
  v1.0, still achievable since Inngest steps run in parallel/pipelined
  serverless invocations rather than waiting on a shared worker pool.
- **Scalability:** Fully serverless — Vercel functions scale per-request,
  Inngest scales step concurrency independently, Neon Postgres and Vercel
  Blob scale without capacity planning. No worker pool to size or manage.
- **Cost control:** Caption-first strategy still minimizes paid STT usage.
  Serverless-everything means no idle worker/Redis cost between jobs —
  you pay per invocation, which fits pre-revenue MVP economics well.
- **Security:** No API keys client-side; signed/expiring URLs for Blob
  asset access; rate-limited `/api/generate` per user via Upstash.
- **Privacy:** Transcripts auto-purged from Vercel Blob after a
  configurable retention window (e.g., 30 days) unless the user opts to
  keep history.

---

## 6. Infra & Deployment

- **Everything:** One Vercel project, one `vercel.json` (if needed),
  one `git push` → deploy. Preview URLs per branch/PR out of the box.
- **Background jobs:** Inngest Cloud (free tier for MVP volume) —
  configured via an environment variable + the single `/api/inngest`
  route; no separate infra to provision.
- **Database:** Neon Postgres, provisioned via the Vercel integration
  (one click from the Vercel dashboard).
- **Storage:** Vercel Blob, provisioned the same way.
- **CI/CD:** GitHub Actions for lint/typecheck/test on PR; Vercel's native
  Git integration handles build + deploy on merge to `main` (no separate
  deploy step to script).
- **Monitoring:** Sentry for errors; Vercel Analytics + Vercel's built-in
  function logs/observability for MVP (no separate observability stack).

---

## 7. Alternatives Considered / Notes

- **Supabase (DB + Auth + Storage combined)** is a valid single-vendor
  alternative to Neon + Clerk + Vercel Blob if you'd prefer one dashboard
  for data/auth/storage instead of Vercel-native services. Either path
  keeps the app itself as a single Vercel deployment; this is a "pick one"
  decision, not an either/or across the architecture.
- **yt-dlp** is intentionally dropped from the MVP stack — it's a strong
  tool, but as a Python binary it doesn't fit a Node-only serverless
  deployment cleanly. Revisit only if `youtubei.js` coverage gaps appear
  (e.g., certain restricted/region-locked videos) — at that point a small
  dedicated extraction service could be added, but that reintroduces a
  second deploy target, so treat it as a deliberate future trade-off, not
  a default.

---

## 8. Future Technical Considerations

- Direct publish: integrate LinkedIn API (requires app review) and X API
  v2 (posting tier) — still fits as Route Handlers + Inngest steps in the
  same app.
- Chrome extension: separate lightweight codebase, calls the same
  deployed API.
- Batch/channel processing: Inngest natively supports fan-out/concurrency
  controls, which maps well to rate-aware batch jobs without adding new
  infra.
- Multi-language: swap/extend STT provider language settings and prompt
  language detection logic.
