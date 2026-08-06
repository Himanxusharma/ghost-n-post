"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
import { ListSkeleton } from "@/components/ui-skeleton";
import { useToast } from "@/components/toast";

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
  const { success, error: toastError } = useToast();
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
      success("API token created", "Copy it now. It won't be shown again.");
      queryClient.invalidateQueries({ queryKey: ["extension-tokens"] });
    },
    onError: (error: Error) => toastError("Token failed", error.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/extension/tokens?id=${id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
    },
    onSuccess: () => {
      success("Token revoked");
      queryClient.invalidateQueries({ queryKey: ["extension-tokens"] });
    },
    onError: (error: Error) => toastError("Revoke failed", error.message),
  });

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />
      <main id="main-content" className="history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="Extension"
            title="Chrome extension"
            description="Ghostwrite from the watch page. No tab hopping."
          >
            <button
              type="button"
              className="tool-btn tool-btn-primary"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create API token"}
            </button>
            <Link href="/" className="text-link">
              Open app
            </Link>
          </PageHeader>

          <section className="extension-steps">
            <ol>
              <li>
                Open <code>chrome://extensions</code>, enable Developer mode,
                and Load unpacked from the repo&apos;s <code>extension/</code>{" "}
                folder.
              </li>
              <li>
                Create an API token below and paste it into the extension
                options.
              </li>
              <li>
                Set API base URL to <code>{appUrl}</code>
              </li>
              <li>
                On YouTube, use the toolbar popup or the on-page &quot;Ghost n
                Post&quot; button.
              </li>
            </ol>
          </section>

          {freshToken ? (
            <div className="token-reveal">
              <p>Copy this token now. It won&apos;t be shown again.</p>
              <code>{freshToken}</code>
            </div>
          ) : null}

          {createMutation.isError ? (
            <p className="field-error" role="alert">
              {(createMutation.error as Error).message}
            </p>
          ) : null}
          {tokensQuery.isLoading ? <ListSkeleton rows={3} /> : null}
          {tokensQuery.isError ? (
            <p className="field-error" role="alert">
              {(tokensQuery.error as Error).message}
            </p>
          ) : null}

          {!tokensQuery.isLoading ? (
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
          ) : null}
          {!tokensQuery.isLoading && tokensQuery.data?.length === 0 ? (
            <p className="hint">
              No active tokens yet. Mint one and plug it into the extension.
            </p>
          ) : null}
        </div>
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
