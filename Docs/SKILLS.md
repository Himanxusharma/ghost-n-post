# Skills & Tech Stack Requirements

**Product:** Ghost n Post
**Purpose:** What skills/tech are needed to build, ship, and maintain this product — useful for team planning, hiring, or solo-dev scoping.

---

## 1. Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js (React) | Fast SSR landing page, minimal-page architecture fits a lean UI |
| Styling | Tailwind CSS | Enforces consistent minimalist design without custom CSS overhead |
| Backend framework | FastAPI (Python) | Native fit for ML/video tooling (yt-dlp, Whisper) — no cross-language glue |
| Video/audio extraction | yt-dlp | Most reliable, actively maintained YouTube extraction tool |
| Transcription (primary) | YouTube captions API / youtube-transcript-api | Free, fast, no compute cost when available |
| Transcription (fallback) | Whisper API / faster-whisper / Deepgram | Reliable STT when captions don't exist |
| LLM generation | Claude API | Post drafting, style-profile extraction, structured JSON output |
| Job queue | Redis + Celery | Async processing for multi-step, multi-second pipeline |
| Database | PostgreSQL | Relational data: users, posts, jobs, style profiles |
| Object storage | S3-compatible (AWS S3 / Cloudflare R2 / Backblaze B2) | Thumbnails, transcripts, temp audio |
| Auth | Supabase Auth / Clerk | Minimal custom auth code for MVP |
| Hosting (frontend) | Vercel | Native Next.js support |
| Hosting (backend/workers) | Railway / Render / Fly.io (MVP) → AWS ECS/K8s (scale) | Simple container deploys early, room to scale later |
| CI/CD | GitHub Actions | Standard lint/test/deploy pipeline |
| Error monitoring | Sentry | Lightweight, fast to integrate |

---

## 2. Skills Required by Area

### Frontend
- React / Next.js (SSR, routing, API integration)
- Tailwind CSS, minimalist UI/UX design sensibility
- State/data fetching with polling or SSE (job status updates)
- Basic accessibility (WCAG contrast, keyboard nav)

### Backend
- Python, FastAPI (REST API design, async endpoints)
- Celery + Redis (task queue design, retries, failure handling)
- Prompt engineering (structured output, style-profile prompting, map-reduce summarization for long transcripts)
- Working with third-party APIs (Claude API, Whisper/Deepgram, YouTube)

### Video/Audio Processing
- yt-dlp usage and edge-case handling (age-restricted, region-locked, private videos)
- Audio extraction/formatting for STT input
- Understanding of caption/subtitle formats (VTT/SRT parsing)

### Data & Infra
- PostgreSQL schema design (users, jobs, posts, style_profiles)
- S3-compatible storage (signed URLs, lifecycle/retention policies)
- Docker containerization
- CI/CD pipeline setup (GitHub Actions)
- Basic DevOps for Railway/Render/Fly.io or AWS

### Product/Design
- Minimalist UI/UX design — restraint is a skill here, not just aesthetics
- Prompt design for "voice matching" (translating writing samples into a usable style spec)
- Understanding platform norms (LinkedIn vs X post structure, thread conventions)

### Legal/Compliance (lightweight, but relevant)
- Awareness of YouTube ToS regarding scraping/download tools
- Basic copyright understanding (paraphrasing vs reproducing transcript/thumbnail usage)
- Data retention/privacy basics (transcript storage, user data deletion)

---

## 3. Team Shape (if hiring / assigning roles)

| Role | Needed for |
|---|---|
| Full-stack engineer (Python + React) | Can single-handedly build MVP given this stack |
| (Optional) ML/prompt engineer | Optimizing style-matching accuracy and cost at scale |
| (Optional) Product designer | Refining the minimalist UI beyond MVP wireframe level |
| (Optional) DevOps | Only needed once scaling past MVP infra (Railway/Render → AWS) |

For a solo builder or small team, one full-stack engineer comfortable with Python + React can ship the MVP end-to-end using this stack.

---

## 4. Suggested Build Order (skills applied in sequence)

1. yt-dlp integration + thumbnail fetch (fastest visible win, no LLM needed yet)
2. Caption extraction pipeline (free transcript path)
3. Whisper/Deepgram fallback integration
4. Claude API prompt design for post generation (LinkedIn + X)
5. Style-profile extraction + injection
6. Job queue wiring (Celery + Redis) for async UX
7. Minimalist frontend wired to polling job status
8. Auth + history + style-profile persistence
