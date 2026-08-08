"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";

export function PrivacyWorkspace() {
  const [styleOpen, setStyleOpen] = useState(false);

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />
      <main id="main-content" className="privacy-page history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="Legal & Transparency"
            title="Privacy Policy"
            description="Last updated: August 9, 2026. How Ghost n Post processes and protects your data."
          />

          <article className="policy-content" style={{ marginTop: "1.5rem", color: "var(--ink)", lineHeight: 1.6, fontSize: "0.9rem" }}>
            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                1. Overview & Information We Collect
              </h2>
              <p>
                Ghost n Post (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. We collect only the data necessary to provide you with YouTube video-to-social post repurposing, style matching, and account management:
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <li><strong>Account Information:</strong> Name, email address, and profile picture obtained via Google Sign-In powered by Clerk.</li>
                <li><strong>Content & Style Data:</strong> YouTube URLs submitted for processing, video metadata, generated draft history, and writing style samples provided in &quot;Match my voice&quot;.</li>
                <li><strong>Extension & Session Data:</strong> Authentication session cookies (<code>__session</code>) used to log into the Ghost n Post Chrome Extension seamlessly.</li>
                <li><strong>Billing Information:</strong> Subscription state, order IDs, and transaction receipts processed securely by Razorpay. Raw credit card and banking credentials are processed directly by Razorpay and are never stored on our servers.</li>
              </ul>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                2. How We Use Your Data
              </h2>
              <p>We use your information exclusively to:</p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <li>Extract transcripts and generate LinkedIn and X post drafts matching your style profile.</li>
                <li>Manage your credit balance, subscription tier, and batch processing queue.</li>
                <li>Authenticate your identity across the web app and Chrome Extension.</li>
                <li>Provide customer support and process enterprise sales requests.</li>
              </ul>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                3. Third-Party Service Providers
              </h2>
              <p>
                To deliver AI processing, authentication, and payments, we share necessary data with trusted providers who comply with strict data protection standards:
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <li><strong>Clerk:</strong> User authentication and identity management.</li>
                <li><strong>Groq & Deepgram:</strong> High-speed AI inference for post generation and audio transcription fallback.</li>
                <li><strong>Razorpay:</strong> Secure payment processing and order management.</li>
                <li><strong>Web3Forms:</strong> Contact form submission processing.</li>
              </ul>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                4. Data Security & Retention
              </h2>
              <p>
                We enforce industry-standard security practices, including HTTPS encryption in transit, timing-safe HMAC SHA256 verification for payments, and encrypted database storage. Your generated drafts remain stored in your private history until you choose to delete them.
              </p>
            </section>

            <section style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>
                5. Your Rights & Contact Information
              </h2>
              <p>
                You have the right to request access to, correction of, or deletion of your personal data at any time. For questions regarding this Privacy Policy or your data, please contact us at:
              </p>
              <p style={{ marginTop: "0.5rem", fontFamily: "var(--font-mono), monospace" }}>
                Email: <strong>support@ghostnpost.com</strong> or visit our <Link href="/contact" className="text-link">Contact Page</Link>.
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
