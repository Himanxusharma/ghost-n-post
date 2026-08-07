# Technical Requirements Document (TRD)

**Product:** Ghost n Post
**Version:** 2.2 (Shipped & Production Verified — Single-Deploy Vercel Architecture)

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
                        │  │ Inngest funcs │──▶│ Groq API call   │   │
                        │  │ (durable job  │   │ (post drafts +  │   │
                        │  │  pipeline)    │   │  style profile) │   │
                        │  └──────┬───────┘   └────────────────┘   │
                        └─────────┼──────────────────────────────────┘
                                  │
              ┌───────────────────┼────────────────────┐
              ▼                   ▼                    ▼
     ┌────────────────┐  ┌────────────────┐   ┌──────────────────┐
     │ Neon Postgres   │  │ Vercel Blob    │   │ Deepgram          │
     │ (Vercel Postgres)│  │ (thumbnails,   │   │ (STT fallback,    │
     │ users, videos,   │  │  transcripts)  │   │  URL-based)       │
     │ posts, jobs,     │  │                │   │                   │
     │ style_profiles   │  │                │   │                   │
     └────────────────┘  └────────────────┘   └──────────────────┘
```

**Key shift from v1.0:** FastAPI + Celery + Redis + separate worker containers
are replaced by **Inngest** — durable functions inside the same Next.js deploy.

---

## 2. Component Breakdown

### 2.1 Application
- **Framework:** Next.js 16 (App Router), TypeScript.
- **Styling:** Tailwind CSS + design tokens in `globals.css` (tactile
  brutalism / archival dark).
- **Data fetching:** React Query for job polling and secondary screens;
  route `loading.tsx` + in-page skeletons for slow loads.
- **Deployment:** Vercel, single project.

### 2.2 API Layer
- Route Handlers under `app/api/**` for validation, auth, jobs, social,
  batch, teams, analytics, extension tokens.
- Node.js serverless runtime (not Edge) for Node-only libs.

### 2.3 Background Jobs — Inngest
- Generate pipeline: `fetch-metadata` → `get-transcript` → `generate-posts`
  → `persist-result`.
- Local: `INNGEST_DEV=1` + `npm run inngest:dev`. Production: omit
  `INNGEST_DEV`; set event + signing keys.

### 2.4 Video / captions
- `youtubei.js` for metadata, thumbnails, captions (no yt-dlp / ffmpeg).

### 2.5 Transcription fallback
- Deepgram from a resolved remote audio URL when captions are missing.
- Transcript stored in Vercel Blob.

### 2.6 Post generation (LLM)
- **Groq** (`llama-3.3-70b-versatile` default; `GROQ_MODEL` override).
- Generates only selected platforms (`linkedin` / `x`).
- Style-profile extraction also via Groq; Zod validates structured JSON.

### 2.7 Database
- Neon Postgres + Drizzle.
- Includes `jobs.platforms` / `posts.platforms` (jsonb) plus publish /
  batch / team / extension tables.

### 2.8 Storage
- Vercel Blob for thumbnails, transcripts, carousel / custom thumbs.

### 2.9 Auth
- Clerk — Google OAuth only. Middleware protects secondary pages + APIs.

### 2.10 Rate limiting
- Upstash Redis + `@upstash/ratelimit` on generate.

### 2.11 Job status
- Poll `GET /api/jobs/{id}` for stage labels.

---

## 3. Data Flow

1. `POST /api/generate` with URL + platforms → create job → Inngest event.
2. Poll `GET /api/jobs/{id}`.
3. Metadata → transcript (captions or Deepgram) → Groq drafts → persist.
4. `GET /api/posts/{id}` renders results.

---

## 4. Key API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/generate` | Start generation job |
| GET | `/api/jobs/{id}` | Poll status/stage |
| GET | `/api/posts/{id}` | Fetch drafts |
| POST | `/api/posts/{id}/regenerate` | Regenerate |
| GET/POST | `/api/style-profile` | Style matching |
| GET/DELETE | `/api/history` | History |
| POST/GET | `/api/inngest` | Inngest invoke |
| * | `/api/social/*`, `/api/publications/*`, `/api/batch/*`, `/api/teams/*`, `/api/analytics`, `/api/extension/*` | Phase 2–4 |

---

## 5. Non-Functional Requirements

- Performance target < 90s with captions.
- Secrets only via env; OAuth state signing; Clerk route protection.
- One Vercel project + Neon + Blob + Inngest + Upstash + Clerk.

## 6. Local vs Production

- Local: `INNGEST_DEV=1`, `NEXT_PUBLIC_APP_URL=http://localhost:3010`
  (match `npm run dev -- -p 3010` and `inngest:dev`).
- Production: omit `INNGEST_DEV`; https `NEXT_PUBLIC_APP_URL`; production
  Clerk keys; sync Inngest to `/api/inngest`.

## 7. Alternatives Considered

- Separate FastAPI + Celery — rejected for Vercel ops weight.
- Anthropic Claude as primary LLM — current provider is Groq; prompts are
  portable if the model layer is swapped.
- yt-dlp — rejected for serverless packaging.
