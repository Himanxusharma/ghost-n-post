# Skills & Tech Stack Requirements

**Product:** Ghost n Post
**Purpose:** Skills/tech needed to build, ship, and maintain this product.

---

## 1. Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| App framework | Next.js 16 (App Router), TypeScript | Frontend + API, one Vercel deploy |
| Styling | Tailwind CSS + design tokens | Brutalist / archival dark UI |
| Background jobs | Inngest | Durable multi-step serverless jobs |
| Video/captions | youtubei.js | Pure JS on Vercel serverless |
| Transcription | YouTube captions → Deepgram fallback | Free first; URL-based STT |
| LLM | Groq API | Drafts + style profiles + structured JSON |
| Database | Neon Postgres + Drizzle | Serverless Postgres, typed ORM |
| Storage | Vercel Blob | Thumbnails + transcripts |
| Auth | Clerk (Google only) | Next.js middleware auth |
| Rate limiting | Upstash Redis | Generate rate limits |
| Hosting | Vercel | Single project for everything |

---

## 2. Skills by Area

### Full-stack
- Next.js App Router, Route Handlers, `loading.tsx`, TypeScript
- Tailwind + product UI restraint; React Query polling
- Accessibility basics

### Jobs
- Inngest step functions, local `inngest:dev`, retries

### Media / STT
- `youtubei.js` edge cases; Deepgram URL STT

### LLM
- Groq (or similar) structured prompting; Zod validation; style-profile prompts

### Data / infra
- Drizzle schema (including `platforms` jsonb); Vercel env/integrations;
  Clerk production Google OAuth domains

### Product
- LinkedIn vs X norms; responsive draft-studio UX

---

## 3. Suggested Build Order

1. Next.js + Clerk Google + Neon schema
2. Generate API + Inngest pipeline (Groq)
3. Home draft studio + polling
4. Style profile, publish/schedule, connections
5. Batch, analytics, extension, teams, languages, custom thumbs

## 4. Not required

- Separate backend hosting / Docker Compose for core product
- Celery + Redis job queue
- Anthropic-specific skills (Groq is current; prompts are portable)
