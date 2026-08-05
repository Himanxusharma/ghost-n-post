# Functional Requirements Document (FRD)

**Product:** Ghost n Post
**Version:** 1.0 (MVP)

---

## 1. UI Philosophy

Minimalist by design — one clear input, one clear output, no dashboard clutter.

- Single-page core flow: **Input → Processing → Output**
- No sidebar navigation for MVP; settings (style profile) accessible via a single icon/modal, not a separate page.
- Generous whitespace, restrained color palette (1 accent color), system font stack for fast load.
- No unnecessary steps, tooltips, or onboarding modals — the input field should be usable within 2 seconds of landing.

---

## 2. Functional Requirements

### FR-1: YouTube Link Input
- User pastes a YouTube URL into a single text field on the homepage.
- System validates URL format client-side before submission.
- Invalid/unsupported URL shows inline error, no page reload.

### FR-2: Video Metadata & Thumbnail Fetch
- On valid link submit, system fetches: title, channel name, duration, thumbnail image.
- Thumbnail is displayed to the user within the first few seconds, before post generation completes (progressive loading).
- If max-res thumbnail unavailable, fall back to next available resolution.

### FR-3: Transcript Extraction
- System first attempts to fetch existing YouTube captions (auto-generated or creator-provided).
- If no captions exist, system extracts audio and transcribes via speech-to-text service.
- Transcript stored with timestamps (used internally; not shown raw to user by default).
- If transcription fails (e.g., no speech, non-English without support), show a clear error state with retry option.

### FR-4: Post Generation
- System generates:
  - 1 LinkedIn post draft (long-form, structured with hook + body + closing line)
  - 1 X post draft (short-form)
  - If content exceeds single X post length, auto-generate an X thread (numbered)
- User can request "regenerate" for alternate variants (up to 3 per platform per session in MVP).
- Each draft is shown in an editable text box — user can directly edit inline before copying.

### FR-5: Style Matching ("Write in my voice")
- User can optionally paste 3–5 sample posts (LinkedIn and/or X) in a "Match my voice" input.
- System extracts a style profile (tone, structure, length pattern, formatting habits) from samples.
- Style profile is saved to the user's account and auto-applied to future generations unless disabled.
- User can view/edit or reset their saved style profile at any time via a single settings modal.
- If no style samples are provided, system uses a neutral, professional default tone.

### FR-6: Output Actions
- Copy-to-clipboard button per generated post.
- Download option (plain text / markdown) for saved records.
- Thumbnail download button (original resolution).
- (Future phase) "Publish now" button — out of scope for MVP.

### FR-7: Error & Edge Case Handling
- Unsupported video (age-restricted, private, region-locked): clear error message, no silent failure.
- Video with no spoken content (music-only): inform user transcript generation isn't possible, don't attempt post generation.
- Long videos (>60 min): show estimated processing time upfront; allow user to proceed or cancel.
- Processing state: show a lightweight progress indicator with stage labels ("Fetching video…", "Transcribing…", "Writing draft…") — no generic spinner with no context.

### FR-8: Account & History (minimal, MVP)
- Basic auth (email or OAuth) required to save style profile and post history.
- History view: simple reverse-chronological list of past generations (thumbnail + post snippet), no complex filtering in MVP.
- User can delete individual history entries.

---

## 3. User Flow (Primary Path)

1. User lands on homepage → sees single input field.
2. Pastes YouTube link → submits.
3. Thumbnail + title appear immediately.
4. Processing indicator shows transcript + generation stages.
5. LinkedIn and X drafts appear side by side (or stacked on mobile).
6. User edits inline if needed, applies saved style profile (on by default if set).
7. User copies or downloads final post + thumbnail.

## 4. Non-Functional Requirements (summary — see TRD for detail)

- Processing time target: < 90 seconds for a typical 10–20 min video.
- Mobile-responsive (single-column layout on small screens).
- Accessible: proper contrast ratios, keyboard-navigable inputs, alt text on thumbnail.
