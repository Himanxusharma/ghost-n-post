"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";

type TokenRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export default function ExtensionPage() {
  const [styleOpen, setStyleOpen] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const tokensQuery = useQuery({
    queryKey: ["extension-tokens"],
    queryFn: async (): Promise<TokenRow[]> => {
      const response = await fetch("/api/extension/tokens");
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/extension/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Chrome extension" }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data as TokenRow & { token: string };
    },
    onSuccess: (data) => {
      setFreshToken(data.token);
      queryClient.invalidateQueries({ queryKey: ["extension-tokens"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/extension/tokens?id=${id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["extension-tokens"] }),
  });

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />
      <main id="main-content" className="history-page" tabIndex={-1}>
        <header className="history-header">
          <p className="brand-sm">Ghost n Post</p>
          <h1>Chrome extension</h1>
          <p>
            Install the local extension, paste your API base URL and token, then
            ghostwrite from any YouTube watch page.
          </p>
        </header>

        <section className="extension-steps">
          <ol>
            <li>
              Open <code>chrome://extensions</code>, enable Developer mode, and
              Load unpacked from the repo&apos;s <code>extension/</code> folder.
            </li>
            <li>Create an API token below and paste it into the extension options.</li>
            <li>
              Set API base URL to <code>{appUrl}</code>
            </li>
            <li>
              On YouTube, use the toolbar popup or the on-page &quot;Ghost n
              Post&quot; button.
            </li>
          </ol>
        </section>

        <div className="publish-actions">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create API token"}
          </button>
          <Link href="/" className="text-link">
            Open app
          </Link>
        </div>

        {freshToken ? (
          <div className="token-reveal">
            <p>Copy this token now — it won&apos;t be shown again.</p>
            <code>{freshToken}</code>
          </div>
        ) : null}

        {createMutation.isError ? (
          <p className="field-error" role="alert">
            {(createMutation.error as Error).message}
          </p>
        ) : null}
        {tokensQuery.isLoading ? <p className="hint">Loading tokens…</p> : null}
        {tokensQuery.isError ? (
          <p className="field-error" role="alert">
            {(tokensQuery.error as Error).message}
          </p>
        ) : null}

        <ul className="history-list">
          {(tokensQuery.data ?? []).map((token) => (
            <li key={token.id} className="publication-row">
              <div className="thumb-placeholder platform-badge">key</div>
              <div className="history-meta">
                <h2>{token.name}</h2>
                <p className="hint">
                  {token.tokenPrefix}… · created{" "}
                  {new Date(token.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => revokeMutation.mutate(token.id)}
                disabled={revokeMutation.isPending}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
        {tokensQuery.data?.length === 0 ? (
          <p className="hint">No active tokens yet. Create one to use the extension.</p>
        ) : null}
      </main>
      {styleOpen ? (
        <StyleSettingsModal
          open={styleOpen}
          onClose={() => setStyleOpen(false)}
        />
      ) : null}
    </div>
  );
}
