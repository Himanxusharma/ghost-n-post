"use client";

import { useState } from "react";

type ContactSalesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ContactSalesModal({ isOpen, onClose }: ContactSalesModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState("5-10");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content contact-sales-modal-panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <span className="brand-badge-kicker">ENTERPRISE & AGENCIES</span>
            <h2 className="modal-title">Talk to Sales</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {submitted ? (
          <div className="contact-success-box" style={{ padding: "1.5rem 0", textAlign: "center" }}>
            <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>🎉</span>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>
              Request Received!
            </h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
              Thank you for reaching out. Our team will review your requirements and contact you at{" "}
              <strong>{email}</strong> within 24 hours.
            </p>
            <button
              type="button"
              className="tool-btn tool-btn-primary"
              onClick={onClose}
              style={{ marginTop: "1.25rem" }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
              Fill in your details below and our team will get in touch with a customized quote and pooled workspace plan.
            </p>

            <label className="field-label" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              Your Name
              <input
                type="text"
                required
                className="input-text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="field-label" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              Work Email
              <input
                type="email"
                required
                className="input-text"
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="field-label" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              Company / Agency Name
              <input
                type="text"
                className="input-text"
                placeholder="Acme Media"
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
                <option value="25+">25+ seats / Enterprise</option>
              </select>
            </label>

            <footer className="modal-footer" style={{ marginTop: "0.5rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="tool-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="tool-btn tool-btn-primary"
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Request Callback"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
