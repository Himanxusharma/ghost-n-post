# Functional Requirements Document (FRD)

**Product:** Ghost n Post
**Version:** 2.1 (Shipped — Single-Deploy Architecture)

---

## 1. UI Philosophy

Focused draft studio — one primary input, clear output, secondary tools in a
fixed bottom nav (not a dense dashboard).

- Core flow: **Input → Processing → Output**
- Style profile via **Match my voice** modal; other tools on dedicated
  routes (`/history`, `/batch`, `/analytics`, `/connections`, `/scheduled`,
  `/team`, `/extension`).
- Visual system: **tactile brutalism × archival indexing** — dark paper
  surface, 1px borders, hard offset shadows, lime accent (`#e8ff47`),
  Space Grotesk / IBM Plex Sans / IBM Plex Mono.
- Responsive: stacked forms and single-column drafts on small screens;
  loading skeletons for slow navigations / fetches.
- Because the whole app is a single Next.js deployment, the landing page is
  server-rendered — no separate API round trip needed just to paint the
  input field.

---

## 2. Functional Requirements

### FR-1: YouTube Link Input
- User pastes a YouTube URL into a single text field on the homepage.
- User selects **Generate for** platforms: LinkedIn, X, or both
  (at least one required).
- Optional: **Write in my voice**, language selector (`auto` or explicit).
- System validates URL format client-side before submission.
- Invalid/unsupported URL shows inline error, no page reload.

### FR-2: Video Metadata & Thumbnail Fetch
- On valid link submit, system fetches: title, channel name, duration,
  thumbnail image (via `youtubei.js`, no external binary required).
- Thumbnail is displayed to the user within the first few seconds, before
  post generation completes (progressive loading) — the metadata step
  completes and updates job status well before transcription/generation do.
- If max-res thumbnail unavailable, fall back to next available resolution.
- User can download the source thumbnail; may also generate a branded
  custom thumbnail from the draft.

### FR-3: Transcript Extraction
- System first attempts to fetch existing YouTube captions (auto-generated
  or creator-provided) via `youtubei.js`.
- If no captions exist, system sends the resolved audio URL directly to
  Deepgram (URL-based STT) — no local audio download/processing step.
- Transcript stored with timestamps in Vercel Blob (used internally; not
  shown raw to user by default).
- If transcription fails (e.g., no speech), show a clear error state with
  retry option.

### FR-4: Post Generation
- System generates only for selected platforms:
  - LinkedIn post draft (long-form, structured with hook + body + CTA)
  - X post draft (short-form)
  - If content exceeds a single X post, auto-generate an X thread (numbered)
- User can request "regenerate" for alternate variants (limited regenerates
  per post).
- Each draft is shown in an editable field with formatting controls
  (Unicode bold/italic/underline/strike/bullets) that paste into LinkedIn/X.
- Markdown / plain-text download actions available from the result toolbar.

### FR-5: Style Matching ("Write in my voice")
- User can optionally paste sample posts (LinkedIn and/or X) in a
  "Match my voice" modal.
- System extracts a style profile (tone, structure, length pattern,
  formatting habits) from samples via Groq.
- Style profile is saved to the user's account (Postgres) and auto-applied
  to future generations unless disabled.
- User can view/edit or reset their saved style profile at any time via the
  settings modal.
- If no style samples are provided, system uses a neutral, professional
  default tone.

### FR-6: Output Actions
- Copy-to-clipboard button per generated post / thread part.
- Download option (plain text / markdown).
- Thumbnail download (source + custom when generated).
- Publish now / schedule (requires Google sign-in + LinkedIn/X connection).

### FR-7: Error & Edge Case Handling
- Unsupported video (age-restricted, private, region-locked): clear error
  message, no silent failure.
- Video with no spoken content (music-only): inform user transcript
  generation isn't possible, don't attempt post generation.
- Long videos (>60 min): show estimated processing time upfront; allow
  user to proceed or cancel.
- Processing state: show a lightweight progress indicator with stage
  labels ("Fetching video…", "Transcribing…", "Writing draft…"), sourced
  directly from the Inngest job's current step — no generic spinner with
  no context.
- Route and data loading: show UI skeletons (not blank screens).

### FR-8: Account & History
- Google OAuth via Clerk required to save style profile, history, publish,
  teams, and extension tokens.
- History view: reverse-chronological list of past generations
  (thumbnail + post snippet); user can delete entries.
- Additional authenticated surfaces: connections, scheduled publications,
  batch/channel jobs, analytics, team workspaces, extension tokens.

---

## 3. User Flow (Primary Path)

1. User lands on homepage → sees draft studio input (server-rendered).
2. Pastes YouTube link, picks platforms → submits.
3. Thumbnail + title appear as metadata completes.
4. Processing indicator shows transcript + generation stages.
5. Selected platform drafts appear (side by side on desktop; stacked on
   mobile).
6. User formats / edits inline; voice profile applied when enabled.
7. User copies, downloads, or publishes / schedules.

## 4. Non-Functional Requirements (summary — see TRD for detail)

- Processing time target: < 90 seconds for a typical 10–20 min video.
- Mobile-responsive (touch-friendly controls, single-column on small screens).
- Accessible: proper contrast ratios, keyboard-navigable inputs, alt text
  on thumbnails, `aria-busy` on loading shells.
- Single deploy target: the entire experience — page, API, background
  processing — ships from one Vercel project.
