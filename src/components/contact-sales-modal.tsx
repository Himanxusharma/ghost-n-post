"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

type ContactSalesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ContactSalesModal({ isOpen, onClose }: ContactSalesModalProps) {
  const { user } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState("5-10");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Auto-fill user name and email from Clerk session when modal opens
  useEffect(() => {
    if (user) {
      if (!name && user.fullName) setName(user.fullName);
      if (!email && user.primaryEmailAddress?.emailAddress) {
        setEmail(user.primaryEmailAddress.emailAddress);
      }
    }
  }, [user, name, email]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !phone.trim()) return;

    setSubmitting(true);
    setErrorText(null);

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "8125efba-cc5f-4b2d-a3de-ce0425cd89a0",
          subject: `⚡ Sales Callback Request: Enterprise / Agency Plan (${company || name || email})`,
          name: name || "Enterprise Prospect",
          email,
          phone,
          company: company || "Not specified",
          team_size: teamSize,
          message: `Sales Callback Request:\nName: ${name}\nEmail: ${email}\nPhone/WhatsApp: ${phone}\nCompany: ${company}\nEstimated Team Size: ${teamSize}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        throw new Error(data.message || "Failed to send request");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setErrorText(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content contact-sales-modal-panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <span className="brand-badge-kicker">ENTERPRISE & AGENCIES</span>
            <h2 className="modal-title">Request Sales Callback</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {submitted ? (
          <div className="contact-success-box" style={{ padding: "1.5rem 0", textAlign: "center" }}>
            <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>📞</span>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", fontWeight: 800, color: "var(--accent)" }}>
              Callback Request Submitted!
            </h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
              Thank you! Our sales team will call or message you at <strong>{phone || email}</strong> within 24 hours to discuss custom team pooling and agency pricing.
            </p>
            <button
              type="button"
              className="tool-btn tool-btn-primary"
              onClick={onClose}
              style={{ marginTop: "1.25rem", width: "100%", justifyContent: "center" }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
              Enter your contact number & email below for a prompt sales callback with custom team volume discounts.
            </p>

            {errorText ? (
              <div className="upgrade-reason-box" style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
                <span className="reason-icon">⚠️</span>
                <p style={{ color: "#f87171" }}>{errorText}</p>
              </div>
            ) : null}

            <label className="field-label" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              Your Full Name
              <input
                type="text"
                required
                className="input-text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="field-label" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              Phone / WhatsApp Number (For Callback)
              <input
                type="tel"
                required
                className="input-text"
                placeholder="+91 98765 43210 / +1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            <label className="field-label" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              Work Email Address
              <input
                type="email"
                required
                className="input-text"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="field-label" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              Company / Agency Name (Optional)
              <input
                type="text"
                className="input-text"
                placeholder="Acme Media Agency"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>

            <label className="field-label" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              Estimated Team Size
              <select
                className="input-text"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
              >
                <option value="2-5">2-5 seats</option>
                <option value="5-10">5-10 seats</option>
                <option value="10-25">10-25 seats</option>
                <option value="25+">25+ seats / High-volume Enterprise</option>
              </select>
            </label>

            <footer className="modal-footer" style={{ marginTop: "0.5rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="tool-btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="tool-btn tool-btn-primary"
                disabled={submitting}
              >
                {submitting ? "Sending Request…" : "Request Sales Callback"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
