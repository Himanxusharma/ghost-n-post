# Ghost n Post

Your AI ghostwriter for video. Turn any YouTube video into a ready-to-publish LinkedIn or X post — in your own voice.

## What it does

1. Paste a YouTube link.
2. We pull the transcript (captions or speech-to-text), extract the video's thumbnail, and analyze the content.
3. We generate a platform-ready post (LinkedIn or X) — optionally matched to your writing style using sample posts you provide.
4. You review, edit, and export or publish.

## Why

Creators and founders publish YouTube content but rarely repurpose it into text posts — it's manual, slow, and the result doesn't sound like them. Ghost n Post automates the video → transcript → post pipeline and adds a style-matching layer so output doesn't read like generic AI copy.

## Core Features

- YouTube link → auto-fetched thumbnail (no upload needed)
- Automatic transcript extraction (captions first, Whisper fallback)
- LLM-generated LinkedIn and X post drafts (multiple variants)
- Voice-matching via user-submitted sample posts (style profile, reusable)
- X thread splitting for long-form insight
- Minimal, distraction-free UI — one input, one output, no dashboard clutter

## Tech Stack (short version)

- **Frontend:** Next.js, Tailwind CSS
- **Backend:** FastAPI (Python)
- **Video/audio extraction:** yt-dlp
- **Transcription:** YouTube captions → Whisper / Deepgram fallback
- **LLM generation:** Claude API
- **Queue:** Redis + Celery (async processing)
- **Database:** PostgreSQL
- **Storage:** S3-compatible bucket (thumbnails, transcripts)
- **Auth:** Supabase Auth / Clerk

See `TRD.md` for full architecture and `SKILLS.md` for the detailed tech breakdown per component.

## Project Docs

| Doc | Purpose |
|---|---|
| `PRD.md` | Product Requirements — problem, users, goals, features, success metrics |
| `FRD.md` | Functional Requirements — detailed feature specs, user flows, UI behavior |
| `TRD.md` | Technical Requirements — architecture, data flow, APIs, infra |
| `SKILLS.md` | Tech stack & skills required to build and maintain the product |

## Getting Started (local dev)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Background workers (transcription + generation jobs)
celery -A worker worker --loglevel=info
```

### Environment Variables

```
ANTHROPIC_API_KEY=
YOUTUBE_API_KEY=
WHISPER_API_KEY=        # or self-hosted faster-whisper
DEEPGRAM_API_KEY=       # optional fallback
DATABASE_URL=
REDIS_URL=
S3_BUCKET_NAME=
S3_ACCESS_KEY=
S3_SECRET_KEY=
AUTH_PROVIDER_KEY=
```

## Status

Early-stage concept / MVP planning. See `PRD.md` for roadmap and phased scope.

## License

TBD.
