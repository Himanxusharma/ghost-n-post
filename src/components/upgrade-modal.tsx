"use client";

import { useState } from "react";

type UpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reason?: string | null;
};

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const [method, setMethod] = useState<"card" | "upi">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setProcessing(true);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "pro_monthly_prelaunch",
          paymentMethod: method,
          billingDetails: method === "card" ? { cardName } : { upiId },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Payment authorization failed");
      }

      setCompleted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      setErrorMsg(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content upgrade-modal-panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <span className="brand-badge-kicker">PRO TIER CHECKOUT</span>
            <h2 className="modal-title">Upgrade to Pro</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {completed ? (
          <div className="checkout-success-view" style={{ padding: "1.5rem 0", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎉</div>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 800, color: "var(--accent)" }}>
              Pro Tier Activated!
            </h3>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
              Your account has been upgraded. <strong>200 Monthly Credits + 50 Trial Credits</strong> are now active on your profile.
            </p>
            <div className="upgrade-features-grid" style={{ marginBottom: "1.25rem", textAlign: "left" }}>
              <div className="upgrade-feature-item">
                <span className="feature-icon">⚡</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>Unlimited Video Length Unlocked</h4>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--ink-soft)" }}>No 3-minute video length caps.</p>
                </div>
              </div>
              <div className="upgrade-feature-item">
                <span className="feature-icon">📺</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>Batch & Channel Repurposing Active</h4>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--ink-soft)" }}>Repurpose YouTube channels in 1 click.</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="tool-btn tool-btn-primary"
              onClick={onClose}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Continue to Studio
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {reason ? (
              <div className="upgrade-reason-box">
                <span className="reason-icon">⚠️</span>
                <p>{reason}</p>
              </div>
            ) : null}

            {errorMsg ? (
              <div className="upgrade-reason-box" style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
                <span className="reason-icon">❌</span>
                <p style={{ color: "#f87171" }}>{errorMsg}</p>
              </div>
            ) : null}

            {/* Plan Summary Box */}
            <div className="checkout-plan-box" style={{ padding: "0.85rem 1rem", background: "#141618", border: "1px solid var(--border)", borderRadius: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>Pro Monthly Plan</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)" }}>₹299/mo</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.775rem", color: "var(--ink-soft)" }}>
                Pre-launch Offer: ₹299/mo for first 3 months (70% OFF), then ₹999/mo. <strong>$0 charged today</strong> during your 50-credit trial.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div>
              <span className="field-label" style={{ display: "block", marginBottom: "0.4rem" }}>Payment Method</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className={`control-btn${method === "card" ? " active" : ""}`}
                  onClick={() => setMethod("card")}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  💳 Credit / Debit Card
                </button>
                <button
                  type="button"
                  className={`control-btn${method === "upi" ? " active" : ""}`}
                  onClick={() => setMethod("upi")}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  📱 UPI / GPay
                </button>
              </div>
            </div>

            {method === "card" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <label className="field-label">
                  Cardholder Name
                  <input
                    type="text"
                    required
                    className="input-text"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Card Number
                  <input
                    type="text"
                    required
                    className="input-text"
                    placeholder="4000 0000 0000 0000"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                  <label className="field-label">
                    Expiry (MM/YY)
                    <input
                      type="text"
                      required
                      className="input-text"
                      placeholder="12/28"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    CVC
                    <input
                      type="text"
                      required
                      className="input-text"
                      placeholder="123"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="field-label">
                UPI ID / VPA
                <input
                  type="text"
                  required
                  className="input-text"
                  placeholder="username@okaxis or 9876543210@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </label>
            )}

            <footer className="modal-footer" style={{ marginTop: "0.5rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="tool-btn" onClick={onClose} disabled={processing}>
                Cancel
              </button>
              <button
                type="submit"
                className="tool-btn tool-btn-primary"
                disabled={processing}
              >
                {processing ? "Securing Session…" : "Subscribe to Pro — ₹299/mo"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
