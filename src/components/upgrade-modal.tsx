"use client";

import { useEffect, useState } from "react";

type UpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reason?: string | null;
  currency?: "INR" | "USD" | "EUR" | "GBP";
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export function UpgradeModal({
  isOpen,
  onClose,
  reason,
  currency = "INR",
}: UpgradeModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load official Razorpay Checkout SDK dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("razorpay-sdk")) return;

    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (!isOpen) return null;

  const handleRazorpayCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setProcessing(true);

    try {
      // 1. Create Razorpay Payment Order on Backend
      const orderRes = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle, currency }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to initialize payment session");
      }

      // If Razorpay SDK is loaded and real order ID was generated
      if (window.Razorpay && !orderData.isMock) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Ghost n Post",
          description: "Pro Tier Subscription — 200 Monthly Credits",
          order_id: orderData.orderId,
          theme: {
            color: "#e8ff47",
          },
          handler: async function (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) {
            try {
              // 2. Verify HMAC SHA256 Signature on Backend
              const verifyRes = await fetch("/api/billing/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan: `pro_${billingCycle}`,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Payment signature verification failed");
              }

              setCompleted(true);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Payment verification failed";
              setErrorMsg(msg);
            } finally {
              setProcessing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      // Mock session verification for local dev environment when keys are omitted
      const mockVerifyRes = await fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: "mock_signature_dev",
          plan: `pro_${billingCycle}`,
        }),
      });

      const mockData = await mockVerifyRes.json();
      if (!mockVerifyRes.ok) {
        throw new Error(mockData.error || "Payment verification failed");
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
            <span className="brand-badge-kicker">RAZORPAY PAYMENT ENGINE</span>
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
              Razorpay Payment Verified!
            </h3>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
              Your Pro Tier subscription is active. <strong>200 Monthly Credits + 50 Trial Credits</strong> are now ready on your account.
            </p>
            <div className="upgrade-features-grid" style={{ marginBottom: "1.25rem", textAlign: "left" }}>
              <div className="upgrade-feature-item">
                <span className="feature-icon">⚡</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>Unlimited Video Length</h4>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--ink-soft)" }}>No 3-minute video length caps.</p>
                </div>
              </div>
              <div className="upgrade-feature-item">
                <span className="feature-icon">📺</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>Batch & Channel Repurposing</h4>
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
          <form onSubmit={handleRazorpayCheckout} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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

            {/* Plan Selector Toggle */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className={`control-btn${billingCycle === "monthly" ? " active" : ""}`}
                onClick={() => setBillingCycle("monthly")}
                style={{ flex: 1, justifyContent: "center", padding: "0.6rem" }}
              >
                Monthly — ₹299/mo
              </button>
              <button
                type="button"
                className={`control-btn${billingCycle === "annual" ? " active" : ""}`}
                onClick={() => setBillingCycle("annual")}
                style={{ flex: 1, justifyContent: "center", padding: "0.6rem" }}
              >
                Annual — ₹2,999/yr <span className="discount-pill" style={{ marginLeft: "0.25rem" }}>Save 75%</span>
              </button>
            </div>

            {/* Razorpay Security Badge Box */}
            <div className="checkout-plan-box" style={{ padding: "0.85rem 1rem", background: "#141618", border: "1px solid var(--border)", borderRadius: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
                  {billingCycle === "monthly" ? "Pro Monthly (Pre-Launch Offer)" : "Pro Annual (Pre-Launch Offer)"}
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)" }}>
                  {billingCycle === "monthly" ? "₹299/mo" : "₹2,999/yr"}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.775rem", color: "var(--ink-soft)" }}>
                💳 Secured by <strong>Razorpay Payment Gateway</strong> (UPI, Cards, NetBanking, Wallets). <strong>$0 charged today</strong> during your 50-credit trial.
              </p>
            </div>

            <footer className="modal-footer" style={{ marginTop: "0.5rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="tool-btn" onClick={onClose} disabled={processing}>
                Cancel
              </button>
              <button
                type="submit"
                className="tool-btn tool-btn-primary"
                disabled={processing}
              >
                {processing ? "Initializing Razorpay…" : `Pay with Razorpay — ${billingCycle === "monthly" ? "₹299/mo" : "₹2,999/yr"}`}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
