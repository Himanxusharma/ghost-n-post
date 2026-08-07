# Functional Requirements Document (FRD)

**Product:** Ghost n Post
**Version:** 2.2 (Shipped & Production Verified — Single-Deploy Architecture)

---

## 1. UI Philosophy & Design System

Focused draft studio — one primary input, clear output, secondary tools in a
fixed bottom nav (not a dense dashboard).

- Core flow: **Input → Processing → Output**
- Style profile via **Match my voice** modal; other tools on dedicated
  routes (`/history`, `/batch`, `/analytics`, `/connections`, `/scheduled`,
  `/team`, `/extension`).
- Visual system: **Tactile Brutalism × Archival Indexing**
  - Surfaces: Dark paper (`--paper: #0e0e0c`), card surface (`--paper-2: #161613`), solid modal (`--paper-solid: #1a1a16`).
  - Text & Accents: Off-white ink (`--ink: #f2efe6`), signature lime accent (`--accent: #e8ff47`), stamp accent (`--stamp: #ff5c35`).
  - Borders & Shadows: Crisp 1px border (`--line: #3d3c35`), hard offset shadow (`--shadow: 3px 3px 0 #050504`), focus ring (`--focus-outline: 1px solid var(--accent)`).
  - Typography: `Space Grotesk` (Headings/Display), `IBM Plex Sans` (Body text), `IBM Plex Mono` (Labels, stamps, counts, codes).
- Responsive Viewport Adaptations:
  - **Desktop (>1024px)**: 2-column side-by-side Draft Studio grid, centered fixed bottom nav bar.
  - **Tablet (768px-1024px)**: Single-column draft grid, vertical form stacking, drawer menu toggle (`.nav-toggle`).
  - **Mobile (375px-560px)**: 3.25rem (~52px) touch targets, sheet modals (`align-items: flex-end`, `max-height: 88vh`), full-width toast notifications with safe-area insets.
  - **Small Mobile (<380px)**: Stacked platform checkboxes, fluid `clamp()` brand typography.
- Because the whole app is a single Next.js deployment, the landing page is
  server-rendered — no separate API round trip needed just to paint the
  input field.

---

## 2. Functional Requirements

### FR-1: YouTube Link Input & Generation Auth Guard
- User pastes a YouTube URL into a single text field on the homepage.
- User selects **Generate for** platforms: LinkedIn, X, or both (at least one required).
- Optional: **Write in my voice**, language selector (`auto` or explicit).
- System validates URL format client-side before submission.
- **Sign-in Requirement for Generation**:
  - `POST /api/generate` requires an authenticated user session (`userId`). Anonymous generation requests return `401 Unauthorized`.
  - When an unauthenticated visitor clicks **Generate**, the system validates the URL, saves pending parameters (`youtubeUrl`, `applyStyle`, `language`, `platforms`, `formatId`) to `sessionStorage`, displays a toast notification ("Sign in required"), and redirects to `/sign-in`.
  - Upon completing 1-click Google OAuth sign-in, the user returns to `/`, and `HomeWorkspace` automatically retrieves the pending parameters from `sessionStorage` and starts the generation pipeline seamlessly without re-pasting.

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

### FR-6: Output Actions & Auth Gating
- **Sign-in Requirement for Copy/Export**: User must be signed in to copy generated draft content or download Markdown/text drafts.
- On click of Copy or Download when unsigned: system displays a clear toast notification ("Sign in required") and automatically redirects the user to `/sign-in` with `returnBackUrl` so they return seamlessly after authentication.
- Copy-to-clipboard button per generated post / thread part (active for signed-in users).
- Download option (plain text / markdown, active for signed-in users).
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
