"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";

export function TermsWorkspace() {
  const [styleOpen, setStyleOpen] = useState(false);

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />
      <main id="main-content" className="terms-page history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="Terms of Service"
            title="Terms & Conditions"
            description="Last updated: August 9, 2026. Please read these terms carefully before using Ghost n Post."
          />

          <article className="policy-content" style={{ marginTop: "1.5rem", color: "var(--ink)", lineHeight: 1.6, fontSize: "0.9rem" }}>
            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using Ghost n Post (&quot;Service&quot;), you agree to be bound by these Terms & Conditions. If you do not agree to these terms, you may not use the Service.
              </p>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                2. Service Description & Credit Metering
              </h2>
              <p>
                Ghost n Post provides AI-assisted content repurposing from YouTube videos to social media post drafts (LinkedIn and X).
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <li><strong>Free Tier:</strong> Includes 20 monthly credits, single-platform generation, and standard video processing up to 3 minutes.</li>
                <li><strong>Pro Tier:</strong> Includes 200 monthly credits, unlimited video length, dual-platform draft generation, voice matching, batch & channel repurposing, and priority processing.</li>
                <li><strong>Credit Weighting:</strong> Processing is calculated at 1 credit per 5-minute video chunk. Deepgram STT fallback (for videos without YouTube captions) incurs a +1 credit surcharge per generation.</li>
              </ul>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                3. Subscriptions, Payments & Pre-Launch Offers
              </h2>
              <p>
                Paid subscriptions are billed via <strong>Razorpay</strong>.
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <li><strong>Pre-Launch Offer:</strong> The first 500 early adopters qualify for ₹299/mo (first 3 months, then ₹999/mo) or ₹2,999 for year 1 (then ₹11,988/yr).</li>
                <li><strong>Trial:</strong> Trialing users receive 50 bonus trial credits. Card verification is required upfront; charges apply only upon subscription renewal or trial credit conversion.</li>
                <li><strong>Cancellation:</strong> You may cancel your subscription at any time from your account settings. Subscriptions remain active until the end of the current paid billing period.</li>
              </ul>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                4. Content Ownership & Intellectual Property
              </h2>
              <p>
                You retain 100% ownership of all original content you input and all social post drafts generated for you by Ghost n Post. You are solely responsible for ensuring that YouTube videos processed by you comply with YouTube Terms of Service and fair use guidelines.
              </p>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                5. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, Ghost n Post shall not be liable for indirect, incidental, or consequential damages arising from service downtime, third-party API availability (Groq, YouTube, Razorpay), or content published to external social platforms.
              </p>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                6. Contact Us
              </h2>
              <p>
                If you have questions regarding these Terms & Conditions, please reach out via our <Link href="/contact" className="text-link">Contact Page</Link> or email <strong>support@ghostnpost.com</strong>.
              </p>
            </section>
          </article>
        </div>
      </main>

      {styleOpen ? (
        <StyleSettingsModal
          open={styleOpen}
          onClose={() => setStyleOpen(false)}
        />
      ) : null}

      <SiteFooter />
    </div>
  );
}
