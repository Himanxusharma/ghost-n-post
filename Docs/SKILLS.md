# Skills & Tech Stack Requirements

**Product:** Ghost n Post
**Purpose:** What skills/tech are needed to build, ship, and maintain this product — useful for team planning, hiring, or solo-dev scoping.

---

## 1. Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| App framework | Next.js 15 (App Router), TypeScript | Single app for frontend + API — one deploy target on Vercel |
| Styling | Tailwind CSS | Enforces consistent minimalist design without custom CSS overhead |
| Background jobs | Inngest | Durable, retryable multi-step jobs running as serverless functions — replaces Celery + Redis + workers with zero extra infra to host |
| Video/caption extraction | youtubei.js | Pure JS/TS, no external binary — runs natively in Vercel serverless functions (yt-dlp does not) |
| Transcription (primary) | YouTube captions (via youtubei.js) | Free, fast, no compute cost when available |
| Transcription (fallback) | Deepgram or AssemblyAI (URL-based) | Accepts a remote audio URL directly — no audio download/ffmpeg step needed |
| LLM generation | Claude API (Anthropic SDK) | Post drafting, style-profile extraction, structured JSON output |
| Database | Neon Postgres (via Vercel Postgres integration) | Serverless Postgres, scales to zero, connects cleanly from serverless functions |
| ORM | Drizzle ORM | TypeScript-first, lightweight, serverless-friendly |
| Object storage | Vercel Blob | Thumbnails + transcripts, native to the deploy platform, no separate S3 account |
| Auth | Clerk | Drop-in email/OAuth for Next.js, first-class Vercel support |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | Serverless, pay-per-request, used only for API rate limiting |
| Hosting (everything) | Vercel | One project, one deploy, frontend + API + background jobs all included |
| CI/CD | GitHub Actions + Vercel Git integration | Lint/typecheck/test on PR; deploy on merge is automatic via Vercel |
| Error monitoring | Sentry | Lightweight, fast to integrate |

**Note:** This is a *single-service* stack by design — there is no separate
backend to host, no Redis broker to run, no worker container to keep alive.
Everything ships as one Next.js app on Vercel.

---

## 2. Skills Required by Area

### Full-Stack (Next.js)
- React / Next.js App Router (Route Handlers, server components, streaming)
- TypeScript across the whole app (frontend + API + job logic share types)
- Tailwind CSS, minimalist UI/UX design sensibility
- React Query for polling job status
- Basic accessibility (WCAG contrast, keyboard nav)

### Background Job Orchestration
- Inngest (or comparable: Trigger.dev, Upstash Workflow) — designing
  multi-step durable functions, retries, and fan-out
- No Celery/Redis broker administration knowledge needed — this is the
  main skill swap from the original stack

### Video/Content Processing
- `youtubei.js` usage and edge-case handling (age-restricted, region-locked,
  private videos)
- Understanding of caption/subtitle formats (VTT/SRT parsing)
- Working with URL-based STT APIs (Deepgram/AssemblyAI) instead of local
  audio extraction

### LLM / Prompt Engineering
- Anthropic Claude API (Node SDK), structured output prompting
- Style-profile prompting (translating writing samples into a reusable
  style spec)
- Map-reduce summarization strategy for long transcripts
- JSON validation (e.g., Zod) for structured model output

### Data & Infra
- Postgres schema design with Drizzle ORM (users, jobs, posts, style_profiles)
- Vercel Blob (signed URLs, retention/cleanup logic)
- Vercel project configuration (env vars, integrations: Neon, Blob, Inngest)
- GitHub Actions for CI (lint/typecheck/test) — deploy itself is handled by
  Vercel's Git integration, no custom deploy scripting required

### Product/Design
- Minimalist UI/UX design — restraint is a skill here, not just aesthetics
- Prompt design for "voice matching"
- Understanding platform norms (LinkedIn vs X post structure, thread conventions)

### Legal/Compliance (lightweight, but relevant)
- Awareness of YouTube ToS regarding caption/metadata extraction
- Basic copyright understanding (paraphrasing vs reproducing transcript;
  thumbnail usage under standard embed/preview norms)
- Data retention/privacy basics (transcript storage window, user data deletion)

---

## 3. Team Shape (if hiring / assigning roles)

| Role | Needed for |
|---|---|
| Full-stack engineer (TypeScript/Next.js) | Can single-handedly build and deploy the entire MVP — one language, one repo, one deploy target |
| (Optional) ML/prompt engineer | Optimizing style-matching accuracy and generation cost at scale |
| (Optional) Product designer | Refining the minimalist UI beyond MVP wireframe level |

A solo builder comfortable with TypeScript/Next.js can now ship the *entire*
product — frontend, API, background jobs, and deployment — without touching
Python, Docker, or a second hosting provider. This is a meaningfully smaller
skill surface than the original two-language, two-deploy-target stack.

---

## 4. Suggested Build Order (skills applied in sequence)

1. Next.js app scaffold + minimalist input UI (fastest visible win)
2. `youtubei.js` metadata + thumbnail fetch → Vercel Blob upload
3. Caption extraction pipeline (free transcript path)
4. Deepgram/AssemblyAI URL-based fallback integration
5. Claude API prompt design for post generation (LinkedIn + X)
6. Wire the pipeline into Inngest as durable steps, with job-status writes
   to Postgres
7. Frontend polling (React Query) against `/api/jobs/{id}`
8. Style-profile extraction + injection
9. Clerk auth + history + style-profile persistence
10. Deploy to Vercel (single project) + connect Neon/Blob/Inngest integrations
