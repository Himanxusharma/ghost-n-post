"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { useToast } from "@/components/toast";

type StyleSettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

type StyleProfile = {
  profileText: string;
  samples: string[];
  enabled: boolean;
};

export function StyleSettingsModal({ open, onClose }: StyleSettingsModalProps) {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [samplesText, setSamplesText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { success, error: toastError, info } = useToast();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const profileQuery = useQuery({
    queryKey: ["style-profile"],
    enabled: open && Boolean(isSignedIn),
    staleTime: 60_000,
    queryFn: async (): Promise<StyleProfile | null> => {
      const response = await fetch("/api/style-profile");
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Failed to load style profile");
      }
      return (json.data as StyleProfile | null) ?? null;
    },
  });

  const profile = profileQuery.data ?? null;

  useEffect(() => {
    if (!open || !profile) return;
    setSamplesText(profile.samples.join("\n\n---\n\n"));
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!isSignedIn) {
      setStatus("Sign in to save your voice profile.");
      return;
    }

    const samples = samplesText
      .split(/\n\s*---\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (samples.length < 3) {
      setStatus("Paste at least 3 sample posts, separated by ---.");
      return;
    }
    if (samples.length > 5) {
      setStatus("Up to 5 sample posts.");
      return;
    }
    if (samples.some((sample) => sample.length < 20)) {
      setStatus("Each sample should be at least 20 characters.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/style-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples, enabled: true }),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Failed to save");
      }
      queryClient.setQueryData(["style-profile"], json.data);
      setStatus("Voice profile saved. Future drafts will match it.");
      success("Voice profile saved", "Future drafts will match it.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save";
      setStatus(message);
      toastError("Save failed", message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!isSignedIn) return;
    setBusy(true);
    try {
      await fetch("/api/style-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      queryClient.setQueryData(["style-profile"], null);
      setSamplesText("");
      setStatus("Style profile reset.");
      info("Style profile reset");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled() {
    if (!profile || !isSignedIn) return;
    const response = await fetch("/api/style-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !profile.enabled }),
    });
    const json = await response.json();
    if (json.success && json.data) {
      queryClient.setQueryData(["style-profile"], json.data);
      success(
        json.data.enabled ? "Voice matching on" : "Voice matching off",
      );
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="style-title">Match my voice</h2>
          <button
            ref={closeRef}
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>

        <p className="modal-lead" id="style-lead">
          Paste 3–5 of your LinkedIn or X posts, separated by a line with
          three dashes (---). We&apos;ll extract a reusable style profile.
        </p>

        {!isSignedIn ? (
          <AuthGate
            title="Sign in to match your voice"
            message="Continue with Google, then save 3–5 sample posts so drafts sound like you."
          />
        ) : (
          <form onSubmit={handleSave} className="style-form">
            <label className="style-samples-label" htmlFor="style-samples">
              Sample posts
            </label>
            <textarea
              id="style-samples"
              value={samplesText}
              onChange={(event) => setSamplesText(event.target.value)}
              rows={10}
              placeholder={"Post one…\n\n---\n\nPost two…\n\n---\n\nPost three…"}
              disabled={busy || profileQuery.isLoading}
              aria-describedby="style-lead"
            />

            {profile ? (
              <div className="profile-preview">
                <div className="profile-preview-head">
                  <strong>Saved profile</strong>
                  <label>
                    <input
                      type="checkbox"
                      checked={profile.enabled}
                      onChange={toggleEnabled}
                    />
                    Auto-apply
                  </label>
                </div>
                <p>{profile.profileText}</p>
              </div>
            ) : null}

            {status ? (
              <p
                className={
                  status.toLowerCase().includes("fail") ||
                  status.toLowerCase().includes("at least") ||
                  status.toLowerCase().includes("up to") ||
                  status.toLowerCase().includes("each sample") ||
                  status.toLowerCase().includes("sign in")
                    ? "field-error"
                    : "hint"
                }
                role={
                  status.toLowerCase().includes("saved") ||
                  status.toLowerCase().includes("reset")
                    ? undefined
                    : "alert"
                }
              >
                {status}
              </p>
            ) : null}

            <div className="modal-actions">
              {profile ? (
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={handleReset}
                  disabled={busy}
                >
                  Reset
                </button>
              ) : (
                <span />
              )}
              <button type="submit" disabled={busy || !samplesText.trim()}>
                {busy ? "Saving…" : "Save voice"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
