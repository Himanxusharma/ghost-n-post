"use client";

import { useState } from "react";
import Link from "next/link";
import { ContactSalesModal } from "@/components/contact-sales-modal";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
import { UpgradeModal } from "@/components/upgrade-modal";

type Currency = "INR" | "USD" | "EUR" | "GBP";

const CURRENCIES: Record<
  Currency,
  {
    symbol: string;
    proMonthlyList: string;
    proMonthlyOffer: string;
    proAnnualList: string;
    proAnnualOffer: string;
  }
> = {
  INR: {
    symbol: "₹",
    proMonthlyList: "999",
    proMonthlyOffer: "299",
    proAnnualList: "11,988",
    proAnnualOffer: "2,999",
  },
  USD: {
    symbol: "$",
    proMonthlyList: "12",
    proMonthlyOffer: "3.99",
    proAnnualList: "144",
    proAnnualOffer: "39",
  },
  EUR: {
    symbol: "€",
    proMonthlyList: "11",
    proMonthlyOffer: "3.49",
    proAnnualList: "132",
    proAnnualOffer: "35",
  },
  GBP: {
    symbol: "£",
    proMonthlyList: "9.99",
    proMonthlyOffer: "2.99",
    proAnnualList: "119",
    proAnnualOffer: "29",
  },
};

const FEATURE_MATRIX = [
  { feature: "Monthly Credits", free: "20 credits", pro: "200 credits", team: "Custom / Pooled" },
  { feature: "YouTube → Draft Generation", free: "1 Platform", pro: "LinkedIn + X", team: "LinkedIn + X" },
  { feature: "Video Length Limit", free: "Up to 3 mins", pro: "Unlimited (30m, 1h+)", team: "Unlimited" },
  { feature: "Thumbnail Auto-Fetch", free: "✓", pro: "✓", team: "✓" },
  { feature: "Chrome Extension Access", free: "✓", pro: "✓", team: "✓" },
  { feature: "Style & Voice Matching", free: "✗", pro: "✓", team: "✓" },
  { feature: "X Thread Auto-Split", free: "✗", pro: "✓", team: "✓" },
  { feature: "Custom Branded Thumbnails", free: "✗", pro: "✓", team: "✓" },
  { feature: "Batch & Channel Repurposing", free: "✗", pro: "✓", team: "✓" },
  { feature: "LinkedIn & X Scheduling", free: "✗", pro: "✓ (Coming soon)", team: "✓ (Coming soon)" },
  { feature: "Analytics Dashboard", free: "✗", pro: "✓ (Coming soon)", team: "✓ + Team Rollups (Coming soon)" },
  { feature: "History Access", free: "Last 5 drafts", pro: "Unlimited", team: "Unlimited" },
  { feature: "Multi-seat Workspaces", free: "✗", pro: "✗", team: "✓" },
  { feature: "Priority Generation Queue", free: "✗", pro: "✓", team: "✓" },
];

export function PricingWorkspace() {
  const [styleOpen, setStyleOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [contactSalesOpen, setContactSalesOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("INR");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const curr = CURRENCIES[currency];

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />
      <main id="main-content" className="pricing-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="Pricing"
            title="Simple, transparent pricing"
            description="Turn YouTube videos into platform-ready social posts in your voice."
          >
            <div className="pricing-controls">
              <div className="currency-selector">
                {(["INR", "USD", "EUR", "GBP"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`control-btn${currency === c ? " active" : ""}`}
                    onClick={() => setCurrency(c)}
                  >
                    {c} ({CURRENCIES[c].symbol})
                  </button>
                ))}
              </div>
              <div className="billing-toggle">
                <button
                  type="button"
                  className={`control-btn${billing === "monthly" ? " active" : ""}`}
                  onClick={() => setBilling("monthly")}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`control-btn${billing === "annual" ? " active" : ""}`}
                  onClick={() => setBilling("annual")}
                >
                  Annual <span className="discount-pill">Save 75%</span>
                </button>
              </div>
            </div>
          </PageHeader>

          {/* Pre-launch offer banner */}
          <section className="prelaunch-banner">
            <div className="prelaunch-badge">PRE-LAUNCH OFFER</div>
            <p>
              ⚡ <strong>First 500 Early Adopters Only:</strong> Get <strong>70% OFF</strong> for your first 3 months (
              {curr.symbol}
              {curr.proMonthlyOffer}/mo) or <strong>75% OFF</strong> Year 1 ({curr.symbol}
              {curr.proAnnualOffer}) + 50 Trial Credits!
            </p>
          </section>

          {/* Pricing cards grid */}
          <div className="pricing-cards-grid">
            {/* Free Tier */}
            <div className="pricing-card">
              <div className="card-header">
                <h3>Free</h3>
                <p className="card-desc">For creators testing the waters</p>
              </div>
              <div className="card-price">
                <span className="amount">
                  {curr.symbol}0
                </span>
                <span className="period">/ forever</span>
              </div>
              <ul className="card-features">
                <li><strong>20 credits</strong> per month</li>
                <li>Single-platform post drafts</li>
                <li>Thumbnail auto-fetch & download</li>
                <li><strong>Chrome extension access</strong></li>
                <li>History access (last 5 generations)</li>
                <li className="feature-disabled">Style & voice matching</li>
                <li className="feature-disabled">Batch & channel processing</li>
              </ul>
              <Link href="/sign-in" className="tool-btn pricing-btn">
                Get started free
              </Link>
            </div>

            {/* Pro Tier (Featured) */}
            <div className="pricing-card pro-card">
              <div className="pro-badge">MOST POPULAR</div>
              <div className="card-header">
                <h3>Pro</h3>
                <p className="card-desc">For serious creators & consistent builders</p>
              </div>
              <div className="card-price">
                {billing === "monthly" ? (
                  <>
                    <span className="strikethrough">
                      {curr.symbol}
                      {curr.proMonthlyList}
                    </span>
                    <span className="amount">
                      {curr.symbol}
                      {curr.proMonthlyOffer}
                    </span>
                    <span className="period">/ month (first 3 months, then {curr.symbol}{curr.proMonthlyList}/mo)</span>
                  </>
                ) : (
                  <>
                    <span className="strikethrough">
                      {curr.symbol}
                      {curr.proAnnualList}
                    </span>
                    <span className="amount">
                      {curr.symbol}
                      {curr.proAnnualOffer}
                    </span>
                    <span className="period">/ year 1 (then {curr.symbol}{curr.proAnnualList}/yr)</span>
                  </>
                )}
              </div>
              <ul className="card-features">
                <li><strong>200 credits</strong> per month</li>
                <li><strong>Unlimited Video Length</strong> (30m, 1h+ podcasts)</li>
                <li>LinkedIn + X drafts generated together</li>
                <li><strong>Automatic X Thread split</strong></li>
                <li><strong>Batch & Channel Repurposing</strong> (up to 25 videos)</li>
                <li><strong>Custom Style & Voice Matching</strong></li>
                <li>Custom branded thumbnail generation</li>
                <li><strong>Chrome Extension access</strong></li>
                <li>Direct LinkedIn & X publishing & scheduling <em>(Coming soon)</em></li>
                <li>Analytics & performance dashboard <em>(Coming soon)</em></li>
                <li>Unlimited draft history</li>
                <li>Priority generation queue</li>
              </ul>
              <button
                type="button"
                className="tool-btn tool-btn-primary pricing-btn"
                onClick={() => {
                  setUpgradeReason("Claim 50 Trial Credits + Pre-Launch Offer");
                  setUpgradeOpen(true);
                }}
              >
                Start 50-Credit Trial
              </button>
            </div>

            {/* Enterprise / Agency Tier */}
            <div className="pricing-card">
              <div className="card-header">
                <h3>Enterprise / Agency</h3>
                <p className="card-desc">For agencies, media teams & custom volume</p>
              </div>
              <div className="card-price">
                <span className="amount">Custom</span>
                <span className="period">/ talk to sales</span>
              </div>
              <ul className="card-features">
                <li><strong>Pooled / Negotiated credits</strong></li>
                <li>Multi-seat team workspaces</li>
                <li>Shared credit pool across team</li>
                <li>Team analytics & rollups <em>(Coming soon)</em></li>
                <li>Dedicated support & onboarding</li>
                <li>Custom procurement & SSO support</li>
              </ul>
              <button
                type="button"
                className="tool-btn pricing-btn"
                onClick={() => setContactSalesOpen(true)}
              >
                Request Sales Callback
              </button>
            </div>
          </div>

          {/* Feature Matrix Table */}
          <section className="matrix-section">
            <h2>Feature Breakdown</h2>
            <div className="matrix-table-wrapper">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Free</th>
                    <th>Pro</th>
                    <th>Enterprise / Agency</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_MATRIX.map((row) => (
                    <tr key={row.feature}>
                      <td className="feature-name">{row.feature}</td>
                      <td>{row.free}</td>
                      <td className="highlight-cell">{row.pro}</td>
                      <td>{row.team}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FAQ Accordion */}
          <section className="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-grid">
              <div className="faq-item">
                <h3>How do credits work?</h3>
                <p>
                  1 credit processes a 5-minute video chunk (~6,000 transcript characters). A 3-minute clip uses 1 credit, while a 15-minute video uses 3 credits.
                </p>
              </div>
              <div className="faq-item">
                <h3>How does the Pre-Launch Offer trial work?</h3>
                <p>
                  The first 500 users get 50 bonus trial credits on Pro. Card is verified at signup with $0 charge until trial credits are exhausted.
                </p>
              </div>
              <div className="faq-item">
                <h3>What happens to unused credits?</h3>
                <p>
                  Unused credits roll over up to 1 additional month&apos;s allowance, so you never lose what you paid for.
                </p>
              </div>
              <div className="faq-item">
                <h3>Can I cancel my subscription anytime?</h3>
                <p>
                  Yes, you can cancel in 1 click anytime from your account settings with no questions asked.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {styleOpen ? (
        <StyleSettingsModal
          open={styleOpen}
          onClose={() => setStyleOpen(false)}
        />
      ) : null}

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />

      <ContactSalesModal
        isOpen={contactSalesOpen}
        onClose={() => setContactSalesOpen(false)}
      />

      <SiteFooter />
    </div>
  );
}
