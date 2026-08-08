# Business Requirements Document (BRD)

**Product:** Ghost n Post
**Version:** 1.2 (Monetization Launch — Pre-Launch Offer, Credit-Based Trial, Feature Gating)
**Status:** Draft — pending stakeholder sign-off on pricing before implementation

---

## 1. Executive Summary

Ghost n Post has shipped its full product (Phases 1–4) and has an active early user base on a free, uncapped experience. This BRD defines the business requirements to introduce **paid tiers** without alienating that early base — balancing revenue generation against retention risk, and setting a pricing structure that is defensible against comparable tools in market.

Core principle guiding every decision below: **we can't make everything paid, but we need a credible path to revenue.** The free tier stays real and useful; paid tiers exist for people who get consistent value and want more volume, more capability, or team/business features.

---

## 2. Business Objectives

1. Convert a meaningful share of the existing free user base to paid without a trust-damaging "bait and switch" moment.
2. Establish a pricing structure with healthy gross margin per paid user, even though exact per-generation cost is not yet measured.
3. Use a pre-launch offer to reward early adopters and drive initial paid conversions, without creating a permanent discount expectation.
4. Create a clear, low-friction path for larger customers (agencies, teams) to reach a sales-assisted Custom plan, rather than forcing them into self-serve tiers that don't fit.
5. Differentiate Free and Pro by **both** credit volume and **feature access**, so the upgrade decision isn't just "I ran out of credits" — it's "Pro does things Free can't."
6. Keep the pricing model simple enough to explain in one screen — consistent with the product's minimalist design philosophy.

## 3. Business Context

- The product has already acquired real users under a free/unlimited model. This is an asset (proof of demand, feedback, word-of-mouth) and a liability (expectation reset risk) at the same time.
- Ghost n Post's differentiator — YouTube video → platform-ready post, in the user's own voice — is not offered by direct competitors in the LinkedIn/X content-tool space (Taplio, Supergrow, AuthoredUp, Typegrow). Those tools compete on scheduling, analytics, and generic AI writing, not video repurposing.
- Competitive reference points (as of mid-2026): Taplio's AI-enabled tier runs roughly $65–69/month ($49/month billed annually); lighter solo-creator tools like Supergrow and AuthoredUp run around $19–20/month. Ghost n Post's proposed ₹1999/month (~$24) sits below the AI-capable competitor tier while offering a feature none of them have — a defensible position, not a race-to-the-bottom one.

## 4. Monetization Model

### 4.1 Tier Structure

| Tier | Price | Credits/month | Who it's for |
|---|---|---|---|
| **Free** | ₹0 | 20 | Trying the product, light/occasional use |
| **Pro** | ₹999/mo or ₹11,988/yr (list) | 200 | Regular creators, consistent posting cadence |
| **Enterprise / Agency** | Sales-assisted, unlisted price | Pooled/negotiated | Agencies, multi-seat teams, high-volume or SSO/compliance needs |

### 4.2 Credit Definition & Duration-Based Weighting

A credit represents processing unit effort (video duration, transcript length, and Map-Reduce chunks):

- **Base Weighting**: **1 credit per 5-minute chunk** (or ~6,000 characters of transcript).
- **STT Surcharge**: **+1 additional credit** if the Deepgram STT fallback is required (no YouTube captions available).

| Video Duration / Chunk Count | YouTube Captions (Tier 1 & 2) | STT Fallback (Tier 3) |
|---|---|---|
| Up to 5 minutes (1 chunk) | 1 credit | 2 credits |
| 5–10 minutes (2 chunks) | 2 credits | 3 credits |
| 10–15 minutes (3 chunks) | 3 credits | 4 credits |
| 15–30 minutes (6 chunks) | 6 credits | 7 credits |

This chunk-based model aligns user credit consumption directly with LLM token usage and processing effort, preserving healthy unit margins across both short clips and long podcasts.

### 4.3 Enterprise / Agency Trigger

Self-serve Pro is capped at individual use. Route to Enterprise / Agency ("Request Sales Callback") when a prospect needs any of:
- More than 1 seat / shared team credit pool
- Volume beyond what a reasonable multiple of Pro would cover
- SSO or procurement/compliance requirements
- Dedicated support or custom analytics

**Pricing stays unlisted** — the pricing page states the trigger explicitly ("Request Sales Callback") without publishing a starting number, keeping deal terms flexible for sales callback.

### 4.4 Overage & Rollover Rules

- **Overage:** Pro users who exhaust monthly credits can purchase a top-up pack (self-serve) rather than being hard-blocked mid-cycle. Prevents churn at the exact moment a user is most engaged.
- **Rollover:** Unused credits roll over capped at one additional month's allowance, then expire. Balances user goodwill against unlimited liability accumulation.

### 4.5 Multi-Currency Pricing

- Top currencies (USD, EUR, GBP) are supported at launch, in addition to INR.
- Displayed prices per currency build in cross-border transaction fees rather than naive FX conversion.
- Rate Card:
  - **INR**: ₹999/mo (List) | ₹299/mo (Offer - 3 mos) || ₹11,988/yr (List) | ₹2,999/yr (Offer - 1 yr)
  - **USD**: $12/mo (List) | $3.99/mo (Offer - 3 mos) || $144/yr (List) | $39/yr (Offer - 1 yr)
  - **EUR**: €11/mo (List) | €3.49/mo (Offer - 3 mos) || €132/yr (List) | €35/yr (Offer - 1 yr)
  - **GBP**: £9.99/mo (List) | £2.99/mo (Offer - 3 mos) || £119/yr (List) | £29/yr (Offer - 1 yr)

### 4.6 Feature Gating by Tier

Upgrading to Pro should not be justified by credit volume alone — certain capabilities are Pro-exclusive so the upgrade case is also a *capability* case, not just a *rationing* case.

| Feature | Free | Pro | Enterprise / Agency |
|---|---|---|---|
| YouTube → draft generation | ✓ (1 platform per generation) | ✓ (LinkedIn + X together) | ✓ |
| Thumbnail auto-fetch & download | ✓ | ✓ | ✓ |
| Chrome extension access | ✓ | ✓ | ✓ |
| Style/voice matching ("write in my voice") | ✗ | ✓ | ✓ |
| X thread auto-split | ✗ | ✓ | ✓ |
| Custom branded thumbnail generation | ✗ | ✓ | ✓ |
| History | Last 5 generations | Unlimited | Unlimited |
| Batch / channel processing | ✗ | ✓ | ✓ |
| Priority generation queue | ✗ | ✓ | ✓ |
| Publish / schedule to LinkedIn & X | ✗ | ✓ (Coming soon) | ✓ (Coming soon) |
| Analytics dashboard | ✗ | ✓ (Coming soon) | ✓ + Team Rollups (Coming soon) |
| Team workspaces / shared credit pool | ✗ | ✗ | ✓ |
| Credit top-up purchase | ✗ | ✓ | Negotiated |

This table is the source of truth for engineering feature-flags by tier.

## 5. Pre-Launch Offer

Reframed from a generic "launch discount" into a **pre-launch offer** — explicitly for early adopters:

1. **Trial (card required, no charge until conversion, cancel anytime):** every trialing user gets **50 bonus trial credits** on top of standard free allowance.
2. **Discounted first paid period:**
   - **Monthly Plan:** ₹299/mo for the first 3 months (70% OFF), then ₹999/mo from month 4.
   - **Annual Plan:** ₹2,999 for year 1 (75% OFF), then ₹11,988/yr from year 2.

| Plan | Trial | List Price | Pre-Launch Offer | Discount | Reverts To |
|---|---|---|---|---|---|
| Pro Monthly | 50 trial credits, card required | ₹999/mo | ₹299/mo (first 3 months) | 70% off | ₹999/mo from month 4 |
| Pro Annual | 50 trial credits, card required | ₹11,988/yr | ₹2,999 (year 1) | 75% off | ₹11,988/yr from year 2 |

**Eligibility (cohort cap only):** The pre-launch offer is available to **the first 500 users only** — this cohort naturally includes the existing early-adopter base (since they'll be first to claim it once announced), which resolves the separate grandfathering question from earlier drafts: there is no need for a distinct bonus-credit mechanic for pre-launch users, because being early *is* the mechanic. The cap is enforced server-side at trial-start (card added), not at first billing, to prevent gaming.

**Cancellation:** Users can cancel at any point — during the trial (no charge, since the card is only authorized/verified, not charged, until trial credits run out) or after converting to a paid cycle (no further charges from the next cycle; already-billed cycles are not automatically refunded unless a separate refund policy is defined).

**Renewal communication requirement:** Users must receive advance notice — recommend when trial credits are running low (e.g. at 40/50 used) so conversion to a paid charge isn't a surprise, and 14 days minimum before the first list-price renewal.

## 6. Existing Free User Migration

The current user base is on an effectively unlimited free experience. This is the highest-risk part of the rollout:

1. **No silent paywall.** Do not cap existing users on their next login without warning. Announce the pricing change and the pre-launch offer with real lead time (recommend 2 weeks minimum) before the free tier's 20-credit cap and feature gating (§4.6) take effect for existing accounts.
2. **Early-access framing does the grandfathering work.** Because the pre-launch offer is capped at the first 500 users and existing users are told first, they are structurally first in line — no separate bonus-credit exception needs to be engineered.
3. **Founding-member framing.** Consider a visible "Founding Member" badge/status for users who claim one of the 500 pre-launch spots — no cost, meaningful loyalty signal.

## 7. Financial Assumptions (Flagged — Not Yet Validated)

The following are **assumptions**, not measured data, and must be validated before finalizing margin targets:

| Assumption | Why it matters | Validation needed |
|---|---|---|
| Per-generation API cost (Groq + Deepgram blended) is materially below ₹10 | Determines whether ₹1999/200 credits (₹10/credit list price) has healthy margin | Pull actual Groq + Deepgram spend against generation volume for at least 2–4 weeks |
| Caption-vs-STT-fallback ratio is high enough that 1-credit generations dominate | Credit weighting (§4.2) assumes most generations are cheap (captions); if fallback usage is high, blended cost rises | Instrument and report % of generations hitting Deepgram fallback |
| Free-tier abuse (multi-account signups) is low enough not to materially affect unit economics | Free tier cost is a pure cost center; abuse inflates it | Monitor signups per device/IP fingerprint post-launch, not just per account |
| Infra overhead (Vercel/Inngest/Neon/Blob/Upstash/Clerk) stays largely flat regardless of paid volume in the near term | Confirms fixed costs are covered by aggregate Pro revenue, not per-user API margin alone | Track monthly infra bill against paid subscriber count |
| International interchange/processing cost per currency corridor (§4.5) is a small, stable % of revenue | Multi-currency pricing needs this baked in, not bolted on after the fact | Get real interchange rates from the payment processor per supported currency before publishing non-INR prices |

**Proposed default trigger to revisit pricing** (no strong preference given, so defaulting to a concrete, reviewable rule rather than leaving it fully open): **review unit economics quarterly, or immediately if blended per-credit cost drifts more than 20% from the §4.2 assumption in any given month** — whichever comes first. This keeps pricing stable in the common case but forces a review before a cost spike quietly erodes margin for a full quarter.

**Recommendation:** treat the ₹1999/₹19,999 list prices as directionally right given competitive positioning (§3), but revisit specifically the credit-count-per-tier (not necessarily the price) once real cost data exists from §7's validation steps.

## 8. Success Metrics

| Metric | Target |
|---|---|
| Free → Pro conversion rate (within 30 days of hitting free-tier cap) | > 8–10% (typical freemium SaaS benchmark; adjust once baseline is known) |
| Trial → paid conversion rate (of the 50-credit trial cohort) | > 25% (card-required trials typically convert higher than card-free) |
| Pre-launch-offer users retained past first list-price renewal | > 60% |
| Existing pre-launch users who claim one of the 500 spots | > 15% of active free base |
| Monthly churn (Pro tier) | < 5% |
| Gross margin per Pro subscriber, post cost-validation | > 70% |
| Custom/Team pipeline generated from self-serve "contact sales" trigger | Tracked from month 1, target set after baseline |

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Existing free users feel betrayed by the shift to paid tiers | Advance notice, early-access framing, founding-member status (§6) |
| Credit weighting assumption is wrong, margin is thinner than expected | Validate within 60 days (§7); adjust credit *counts* per tier, not headline price, to preserve pricing-page consistency |
| 500-user cohort cap is gamed (fake signups to grab a slot without intent to convert) | Enforce the cap server-side at trial-start (card added), not at billing; monitor for signup spikes as the cap approaches |
| Trial abuse — same user creates multiple accounts to repeatedly claim the 50-credit trial | Card-required trial (already decided) + tie one-time trial eligibility to payment-method fingerprint, not just account/email |
| Credit-based trial has no time backstop, so a low-usage user could stay "in trial" indefinitely without ever exhausting 50 credits | Recommend adding a backstop expiry (e.g., 60–90 days) even though the primary trigger is credit exhaustion — otherwise a trial could sit open with no conversion or cancellation signal indefinitely; flagged as an open decision (§12) |
| User forgets trial is about to convert to a paid charge | Low-credit-remaining notification (e.g. at 40/50 used) before the discounted first cycle bills |
| Users on discounted first cycle churn immediately after renewal to list price | Renewal notice + a value-reinforcement touchpoint (usage recap, not just a billing email) before the list-price charge |
| Naive FX conversion under/over-prices non-INR currencies relative to real payment-processing cost | Build interchange cost into each currency's price (§4.5), confirmed with actual processor rates before publishing |

## 10. Out of Scope (this BRD)

- Exact Custom/Team pricing (negotiated case-by-case; intentionally kept unlisted per §4.3)
- Enterprise procurement/security questionnaire process
- Exact currency list beyond the initial top-currency set (§4.5) — to be finalized with the payment processor

## 11. Stakeholders & Approval

| Role | Responsibility |
|---|---|
| Product/Founder | Final sign-off on tier structure, credit weighting, pre-launch offer terms, feature-gating matrix (§4.6) |
| Engineering | Instrument cost-tracking (§7) before/at launch, implement credit metering, trial mechanics, feature flags by tier, multi-currency pricing display |
| Support/Community | Own the existing-user migration communication (§6) |
| Finance (if applicable) | Validate margin assumptions once real cost data is available; confirm interchange rates per currency corridor |

## 12. Open Questions Carried Forward

- Exact list of supported currencies beyond INR — confirm with payment processor which top currencies (USD/EUR/GBP/AED/others) are worth supporting at launch vs. added later.
- Should the credit-based trial have a backstop time expiry (e.g. 60–90 days) in addition to the 50-credit cap, to close the indefinite-low-usage-trial loophole flagged in §9?
- Are the 50 trial credits a separate pool on top of Pro-tier features, or do they simply unlock Pro features temporarily while drawing from the same credit ledger as the eventual paid plan?
- What exact payment-method-fingerprinting approach (card fingerprint, not just card number) will be used to enforce one-trial-per-user, and does the payment processor support this out of the box?
