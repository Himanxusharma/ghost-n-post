"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";

export function ContactWorkspace() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [styleOpen, setStyleOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isCallbackRequest, setIsCallbackRequest] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  // Auto-fill user name and email from Clerk session
  useEffect(() => {
    if (user) {
      if (!name && user.fullName) setName(user.fullName);
      if (!email && user.primaryEmailAddress?.emailAddress) {
        setEmail(user.primaryEmailAddress.emailAddress);
      }
    }
  }, [user, name, email]);

  // Check URL params for enterprise callback request pre-fill
  useEffect(() => {
    const subjectParam = searchParams.get("subject");
    const planParam = searchParams.get("plan");

    if (subjectParam === "callback" || planParam === "enterprise" || planParam === "custom") {
      setIsCallbackRequest(true);
      if (!message) {
        setMessage(
          "Hi Ghost n Post Team,\n\nI would like to request a sales callback regarding your Enterprise / Agency custom plan. Please reach out to me with pricing and team workspace details.",
        );
      }
    }
  }, [searchParams, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setStatus("submitting");
    setErrorText(null);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "8125efba-cc5f-4b2d-a3de-ce0425cd89a0",
          name,
          email,
          phone: phone || "Not provided",
          message,
          subject: isCallbackRequest
            ? `📞 Sales Callback Request from ${name} (${phone || email})`
            : `New Ghost n Post Contact Form Inquiry from ${name}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage("");
      } else {
        throw new Error(data.message || "Failed to submit form");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setErrorText(msg);
      setStatus("error");
    }
  };

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />
      <main id="main-content" className="contact-page history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp={isCallbackRequest ? "Sales & Enterprise Callback" : "Support & Feedback"}
            title={isCallbackRequest ? "Request Sales Callback" : "Contact Us"}
            description={
              isCallbackRequest
                ? "Enter your contact number & email below for a prompt sales callback regarding Enterprise / Agency custom pricing."
                : "Have questions, feature requests, or enterprise inquiries? Send us a message below."
            }
          />

          <div className="contact-grid" style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
            {/* Direct Web3Forms Submission Form */}
            <div className="contact-form-container">
              {status === "success" ? (
                <div className="contact-success-box" style={{ padding: "2rem", background: "#141618", border: "1px solid var(--accent)", textAlign: "center" }}>
                  <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>
                    {isCallbackRequest ? "📞" : "✉️"}
                  </span>
                  <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 800, color: "var(--accent)" }}>
                    {isCallbackRequest ? "Callback Request Submitted!" : "Message Sent Successfully!"}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
                    {isCallbackRequest
                      ? `Thank you! Our sales team will call or message you at ${phone || email} within 24 hours.`
                      : "Thank you for reaching out. Our team will review your message and get back to you within 24 hours."}
                  </p>
                  <button
                    type="button"
                    className="tool-btn tool-btn-primary"
                    onClick={() => setStatus("idle")}
                    style={{ marginTop: "1.25rem" }}
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form
                  action="https://api.web3forms.com/submit"
                  method="POST"
                  onSubmit={handleSubmit}
                  style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
                >
                  <input
                    type="hidden"
                    name="access_key"
                    value="8125efba-cc5f-4b2d-a3de-ce0425cd89a0"
                  />

                  {errorText ? (
                    <div className="upgrade-reason-box" style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
                      <span className="reason-icon">⚠️</span>
                      <p style={{ color: "#f87171" }}>{errorText}</p>
                    </div>
                  ) : null}

                  <div className="contact-field-group">
                    <label htmlFor="contact-name" className="contact-label">
                      Your Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      required
                      className="contact-input"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="contact-field-group">
                    <label htmlFor="contact-email" className="contact-label">
                      Your Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      required
                      className="contact-input"
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="contact-field-group">
                    <label htmlFor="contact-phone" className="contact-label">
                      Phone / WhatsApp Number (For Sales Callback)
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      name="phone"
                      className="contact-input"
                      placeholder="+91 98765 43210 / +1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="contact-field-group">
                    <label htmlFor="contact-message" className="contact-label">
                      Message / Inquiry Details
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={5}
                      className="contact-textarea"
                      placeholder="Tell us how we can help you or what team size you need..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      style={{ resize: "vertical", minHeight: "130px" }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="tool-btn tool-btn-primary"
                    disabled={status === "submitting"}
                    style={{ marginTop: "0.5rem", width: "100%", justifyContent: "center", padding: "0.85rem" }}
                  >
                    {status === "submitting"
                      ? "Submitting…"
                      : isCallbackRequest
                        ? "Request Sales Callback"
                        : "Submit Form"}
                  </button>
                </form>
              )}
            </div>

            {/* Contact Details & Sales Hours */}
            <div className="contact-info-card" style={{ padding: "1.5rem", background: "#141618", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>
                  Need Direct Assistance?
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
                  We are available for creator support, enterprise workspace setups, and custom AI style profiling.
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>
                  ⚡ Sales & Support Email
                </h4>
                <p style={{ margin: 0, fontSize: "0.875rem", fontFamily: "var(--font-mono), monospace", color: "var(--ink)" }}>
                  support@ghostnpost.com
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>
                  📍 Callback Response Time
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
                  Mon–Fri, 9:00 AM – 7:00 PM IST (Callbacks processed within 24 hours).
                </p>
              </div>
            </div>
          </div>
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
