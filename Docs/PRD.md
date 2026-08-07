# Product Requirements Document (PRD)

**Product:** Ghost n Post
**Version:** 2.2
**Status:** Phase 1–4 shipped & production verified (Vercel build hardened, responsive audit complete)

---

## 1. Problem Statement

Creators, founders, and marketers publish long-form YouTube content but
rarely repurpose it into LinkedIn or X posts, because:

- Manually rewatching and writing takes 30–60+ minutes per video.
- Generic AI writing tools produce text that doesn't sound like the creator.
- Sourcing a good thumbnail/visual for the post is a separate manual step.

## 2. Goal

Let a user go from **"YouTube link" to "publish-ready, on-brand social
post"** in under 2 minutes, with minimal manual editing — and ship the
product itself as simply as possible: one repo, one deploy, on Vercel.

## 3. Target Users

- **Primary:** Solo creators / founders who post YouTube content and want
  consistent LinkedIn/X presence without extra effort.
- **Secondary:** Social media managers/agencies repurposing client video
  content at scale.
- **Tertiary:** Marketing teams turning webinars/interviews into social
  snippets.

## 4. User Stories

- As a creator, I want to paste a YouTube link and get a LinkedIn / X post
  draft so I don't have to write it myself.
- As a creator, I want to choose LinkedIn, X, or both before generating.
- As a creator, I want the generated post to sound like *me*, not like
  generic AI copy.
- As a creator, I want the video's thumbnail auto-attached so I don't have
  to design one.
- As a creator, I want formatting that still looks right when I paste into
  LinkedIn or X.
- As an X user, I want long insights automatically split into a thread.
- As a returning user, I want my voice/style saved so I don't re-paste
  examples every time.
- As a creator, I want to publish or schedule drafts without leaving the app.

## 5. Scope

### Shipped (Phase 1–4)

- YouTube URL input → transcript extraction → Groq drafts
- Platform selection (LinkedIn / X)
- Thumbnail auto-fetch + download; custom branded thumbnail generation
- Style-matching via sample posts
- Copy / markdown / text export; Unicode mathematical formatting layer (bold/italic paste-through)
- Publish + schedule to LinkedIn/X
- History, batch/channel mode, analytics, Chrome extension, teams
- Multi-language generation (`auto` + explicit locales)
- Responsive Tactile Brutalist UI (verified across Desktop >1024px, Tablet 768px-1024px, Mobile 375px-560px, and Small Mobile <380px)
- Production Vercel single-project deployment hardened (`npm run build` verified)

### Future / open

- Deeper LinkedIn analytics (partner-gated today)
- Pricing / freemium metering
- Broader video sources beyond YouTube

## 6. Success Metrics

| Metric | Target |
|---|---|
| Time from link paste to usable draft | < 90 seconds (avg video) |
| % of generated posts published with minor/no edits | > 40% |
| User returns to generate a 2nd post within 7 days | > 30% |
| Style-match satisfaction (user rating) | > 4/5 avg |

## 7. Constraints & Assumptions

- Assumes video has either existing captions or clear spoken audio (not
  purely music/visual content).
- Videos are assumed to be under a reasonable length cap (e.g., 60 min) to
  control transcription cost/time.
- Public videos only for the primary flow (no private/auth-gated YouTube).
- Multilingual drafts are supported; quality depends on transcript + model.
- Extraction relies on `youtubei.js` (pure JS) rather than `yt-dlp`, to keep
  the product deployable as a single Node/Next.js app on Vercel.
- Auth is **Google-only** via Clerk.

## 8. Risks

| Risk | Mitigation |
|---|---|
| YouTube ToS / scraping restrictions | Prefer captions; monitor `youtubei.js` failure rate |
| Transcription cost at scale | Prefer free YouTube captions; Deepgram only as fallback |
| Generic-sounding AI output | Style-profile layer + regenerates + easy inline edit |
| Copyright concerns | Paraphrase into posts; never republish transcript verbatim |
| `youtubei.js` coverage gaps | Monitor failures; narrow fallback if material |

## 9. Phased Roadmap

- **Phase 1 — shipped:** Core pipeline, style matching, history
- **Phase 2 — shipped:** Direct publishing, scheduling, carousel images
- **Phase 3 — shipped:** Chrome extension, batch/channel, analytics
- **Phase 4 — shipped:** Multi-language, team accounts, custom thumbnails

## 10. Open Questions

- Do we support unlisted/private videos later (requires YouTube OAuth)?
- Pricing model — freemium credits per video vs. flat subscription?
- Do we store transcripts long-term, or purge after generation?
- At what job volume does Inngest leave the free tier (billing only — still
  no extra infra to host)?
