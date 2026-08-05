# Technical Requirements Document (TRD)

**Product:** Ghost n Post
**Version:** 1.0 (MVP)

---

## 1. Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│   Frontend  │────▶│   Backend    │────▶│  Job Queue (Redis) │
│  Next.js    │◀────│   FastAPI    │◀────│  + Celery Workers  │
└─────────────┘     └──────────────┘     └─────────┬──────────┘
                            │                        │
                            ▼                        ▼
                     ┌─────────────┐       ┌──────────────────┐
                     │  PostgreSQL │       │  Worker Pipeline: │
                     │  (users,    │       │  yt-dlp →         │
                     │  posts,     │       │  transcript →      │
                     │  style      │       │  Claude API →      │
                     │  profiles)  │       │  post drafts        │
                     └─────────────┘       └─────────┬──────────┘
                                                       ▼
                                            ┌──────────────────┐
                                            │  S3-compatible    │
                                            │  storage           │
                                            │  (thumbnails,      │
                                            │  transcripts)       │
                                            └──────────────────┘
```

## 2. Component Breakdown

### 2.1 Frontend
- **Framework:** Next.js (React) — SSR for fast first paint on the minimal landing page.
- **Styling:** Tailwind CSS — utility classes keep the minimalist UI consistent without custom CSS sprawl.
- **State:** React Query (server state/polling job status) + minimal local state (no heavy global store needed for MVP).
- **Deployment:** Vercel (simplest for Next.js) or containerized on the same infra as backend.

### 2.2 Backend API
- **Framework:** FastAPI (Python) — chosen over Node because the video/ML pipeline (yt-dlp, Whisper, audio handling) is Python-native, avoiding cross-language glue.
- Responsibilities: request validation, job orchestration, auth, serving post/history data.
- Exposes REST endpoints (see §4).

### 2.3 Job Queue & Workers
- **Queue:** Redis
- **Task runner:** Celery
- Why async: transcript + generation can take 30–90+ seconds; must not block HTTP requests. Frontend polls job status or uses WebSocket/SSE for live stage updates ("Fetching…", "Transcribing…", "Writing…").

### 2.4 Video/Audio Extraction
- **Tool:** `yt-dlp`
- Extracts: metadata (title, duration, channel), audio-only stream (for STT fallback), thumbnail URL/image.
- Run in an isolated worker process/container; validate URL and duration cap before extraction to control cost.

### 2.5 Transcription
- **Primary:** YouTube captions via `yt-dlp` subtitle extraction or `youtube-transcript-api` — free, fast, no compute cost.
- **Fallback:** Whisper API (OpenAI) or self-hosted `faster-whisper` for cost control at scale; Deepgram as a secondary fallback option (good pricing, diarization if needed later).
- Output: timestamped transcript stored in S3 (raw) and referenced in Postgres (metadata only, not full text, to keep DB lean).

### 2.6 Post Generation (LLM Layer)
- **Model:** Claude API (Claude Sonnet class model — balance of quality/cost/speed for this use case).
- **Prompt structure:**
  - System prompt: platform-specific formatting rules (LinkedIn vs X), style-profile injection.
  - User content: cleaned transcript (chunked/summarized via map-reduce if video is long).
- **Style matching implementation:**
  - MVP: few-shot — inject up to 5 raw sample posts into the prompt.
  - Post-MVP optimization: pre-extract a compact "style profile" (JSON: tone, avg sentence length, formatting habits, emoji usage, hook style) once per user via a one-time LLM call, then reuse that profile in every generation prompt instead of raw samples — cheaper and more consistent.
- Output parsed into structured JSON (LinkedIn post, X post, X thread array) using structured output prompting.

### 2.7 Database
- **PostgreSQL**
- Core tables: `users`, `videos`, `posts`, `style_profiles`, `jobs`.
- Keep large text (transcripts) out of Postgres rows where possible — reference S3 object keys instead.

### 2.8 Storage
- **S3-compatible bucket** (AWS S3, Cloudflare R2, or Backblaze B2 for cost) — stores thumbnails, raw transcripts, audio temp files (auto-purged after processing).

### 2.9 Auth
- **Supabase Auth** or **Clerk** — handles email/OAuth, minimal custom auth code needed for MVP.

## 3. Data Flow (Step-by-Step)

1. Frontend submits YouTube URL → `POST /api/generate`.
2. Backend validates URL, creates a `job` record, enqueues Celery task, returns `job_id`.
3. Frontend polls `GET /api/jobs/{job_id}` (or subscribes via SSE) for status updates.
4. Worker: `yt-dlp` fetches metadata + thumbnail → uploads thumbnail to S3 → updates job stage.
5. Worker: attempts caption extraction → falls back to Whisper/Deepgram if needed → stores transcript in S3.
6. Worker: builds prompt (transcript + style profile if available) → calls Claude API → parses structured post output.
7. Worker: writes `posts` record, marks job complete.
8. Frontend fetches final result, renders thumbnail + post drafts.

## 4. Key API Endpoints (MVP)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/generate` | Submit YouTube URL, start job |
| GET | `/api/jobs/{id}` | Poll job status/stage |
| GET | `/api/posts/{id}` | Fetch generated post result |
| POST | `/api/style-profile` | Submit sample posts, generate/update style profile |
| GET | `/api/style-profile` | Fetch current user's style profile |
| GET | `/api/history` | List past generations for logged-in user |
| DELETE | `/api/history/{id}` | Delete a history entry |

## 5. Non-Functional Requirements

- **Performance:** End-to-end target < 90s for a 10–20 min video with existing captions; < 3 min if STT fallback required.
- **Scalability:** Worker pool horizontally scalable (Celery workers behind Redis); stateless API layer.
- **Cost control:** Caption-first strategy minimizes paid STT usage; enforce video duration cap in MVP.
- **Security:** No storage of API keys client-side; signed/expiring URLs for S3 asset access; rate-limit `/api/generate` per user.
- **Privacy:** Transcripts auto-purged after a configurable retention window (e.g., 30 days) unless user opts to keep history.

## 6. Infra & Deployment

- **Frontend:** Vercel
- **Backend + Workers:** Containerized (Docker) on Railway/Render/Fly.io for MVP simplicity; migrate to AWS ECS/Kubernetes if scale demands it.
- **CI/CD:** GitHub Actions — lint/test on PR, deploy on merge to main.
- **Monitoring:** Sentry (errors), basic logging via provider dashboards for MVP (no heavy observability stack needed yet).

## 7. Future Technical Considerations

- Direct publish: integrate LinkedIn API (requires app review) and X API v2 (posting tier).
- Chrome extension: separate lightweight codebase, calls same backend API.
- Batch/channel processing: needs job-chaining and rate-aware queuing to avoid YouTube throttling.
- Multi-language: swap/extend STT and prompt language detection logic.
