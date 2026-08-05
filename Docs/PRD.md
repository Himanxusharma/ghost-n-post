# Product Requirements Document (PRD)

**Product:** Ghost n Post
**Version:** 1.0 (MVP)
**Status:** Draft

---

## 1. Problem Statement

Creators, founders, and marketers publish long-form YouTube content but rarely repurpose it into LinkedIn or X posts, because:

- Manually rewatching and writing takes 30–60+ minutes per video.
- Generic AI writing tools produce text that doesn't sound like the creator.
- Sourcing a good thumbnail/visual for the post is a separate manual step.

## 2. Goal

Let a user go from **"YouTube link" to "publish-ready, on-brand social post"** in under 2 minutes, with minimal manual editing.

## 3. Target Users

- **Primary:** Solo creators / founders who post YouTube content and want consistent LinkedIn/X presence without extra effort.
- **Secondary:** Social media managers/agencies repurposing client video content at scale.
- **Tertiary:** Marketing teams turning webinars/interviews into social snippets.

## 4. User Stories

- As a creator, I want to paste a YouTube link and get a LinkedIn post draft so I don't have to write it myself.
- As a creator, I want the generated post to sound like *me*, not like generic AI copy.
- As a creator, I want the video's thumbnail auto-attached so I don't have to design one.
- As a creator, I want multiple post variants so I can pick the best hook.
- As an X user, I want long insights automatically split into a thread.
- As a returning user, I want my voice/style saved so I don't re-paste examples every time.

## 5. Scope

### In Scope (MVP)
- YouTube URL input → transcript extraction
- Thumbnail auto-fetch
- LinkedIn post generation (1 format)
- X post + thread generation
- Style-matching via user-submitted sample posts (few-shot, stored per user)
- Copy/export generated post
- Minimal single-page UI (input → output, no dashboard sprawl)

### Out of Scope (MVP — future phases)
- Direct publishing to LinkedIn/X (API posting)
- Chrome extension
- Batch/channel-level processing
- Auto-generated quote-card thumbnails
- Scheduling
- Team/agency multi-seat accounts

## 6. Success Metrics

| Metric | Target (MVP) |
|---|---|
| Time from link paste to usable draft | < 90 seconds (avg video) |
| % of generated posts published with minor/no edits | > 40% |
| User returns to generate a 2nd post within 7 days | > 30% |
| Style-match satisfaction (user rating) | > 4/5 avg |

## 7. Constraints & Assumptions

- Assumes video has either existing captions or clear spoken audio (not purely music/visual content).
- Videos are assumed to be under a reasonable length cap for MVP (e.g., 60 min) to control transcription cost/time.
- Public videos only (no private/unlisted auth-gated content in MVP).
- English-first; multilingual support is a future phase.

## 8. Risks

| Risk | Mitigation |
|---|---|
| YouTube ToS / scraping restrictions | Use official YouTube Data API where possible; yt-dlp as fallback with usage monitoring |
| Transcription cost at scale | Prefer free YouTube captions first; only fall back to paid STT when necessary |
| Generic-sounding AI output | Style-profile layer + multiple variants + easy regeneration |
| Copyright concerns (posting video content) | Only extract/paraphrase, never republish transcript verbatim; thumbnail usage falls under standard embed/preview norms |

## 9. Phased Roadmap

- **Phase 1 (MVP):** Core pipeline — link → transcript → post + thumbnail, style matching via sample posts.
- **Phase 2:** Direct publishing (LinkedIn/X API), scheduling, carousel/image post generation.
- **Phase 3:** Chrome extension, batch/channel mode, analytics on post performance.
- **Phase 4:** Multi-language support, team accounts, custom thumbnail generation.

## 10. Open Questions

- Do we support unlisted/private videos in a later phase (requires OAuth)?
- Pricing model — freemium credits per video vs. flat subscription?
- Do we store transcripts long-term, or purge after generation for storage/privacy reasons?
