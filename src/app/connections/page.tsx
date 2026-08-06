"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
import { ListSkeleton } from "@/components/ui-skeleton";
import { useToast } from "@/components/toast";

type AccountsResponse = {
  configured: { linkedin: boolean; x: boolean };
  accounts: Array<{
    id: string;
    platform: "linkedin" | "x";
    displayName: string | null;
    platformUsername: string | null;
    connectedAt: string;
  }>;
};

export default function ConnectionsPage() {
  const [styleOpen, setStyleOpen] = useState(false);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    staleTime: 60_000,
    queryFn: async (): Promise<AccountsResponse> => {
      const response = await fetch("/api/social/accounts");
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Failed to load accounts");
      }
      return json.data;
    },
  });

  const disconnect = useMutation({
    mutationFn: async (platform: "linkedin" | "x") => {
      const response = await fetch(
        `/api/social/accounts?platform=${platform}`,
        { method: "DELETE" },
      );
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Disconnect failed");
      }
      return platform;
    },
    onSuccess: (platform) => {
      success(
        "Disconnected",
        platform === "linkedin" ? "LinkedIn removed." : "X removed.",
      );
      queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
    },
    onError: (error: Error) => toastError("Disconnect failed", error.message),
  });

  const linkedin = accountsQuery.data?.accounts.find(
    (account) => account.platform === "linkedin",
  );
  const x = accountsQuery.data?.accounts.find(
    (account) => account.platform === "x",
  );

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />

      <main id="main-content" className="history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="Connections"
            title="Connections"
            description="Connect LinkedIn and X to publish or schedule drafts."
            backHref="/"
            backLabel="← Back to drafts"
          />

          {accountsQuery.isLoading ? (
            <ListSkeleton rows={2} withThumb={false} />
          ) : null}
          {accountsQuery.isError ? (
            <p className="field-error" role="alert">
              {(accountsQuery.error as Error).message}
            </p>
          ) : null}
          {disconnect.isError ? (
            <p className="field-error" role="alert">
              {(disconnect.error as Error).message}
            </p>
          ) : null}

          {!accountsQuery.isLoading ? (
            <ul className="connection-list">
              <li>
                <div>
                  <h2>LinkedIn</h2>
                  {linkedin ? (
                    <p>
                      Connected as{" "}
                      {linkedin.displayName || linkedin.platformUsername}
                    </p>
                  ) : (
                    <p className="hint">
                      {accountsQuery.data?.configured.linkedin
                        ? "Not connected"
                        : "Set LINKEDIN_CLIENT_ID / SECRET to enable"}
                    </p>
                  )}
                </div>
                {linkedin ? (
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => disconnect.mutate("linkedin")}
                  >
                    Disconnect
                  </button>
                ) : (
                  <a
                    className="nav-cta"
                    href="/api/social/linkedin/start?returnTo=/connections"
                  >
                    Connect
                  </a>
                )}
              </li>

              <li>
                <div>
                  <h2>X</h2>
                  {x ? (
                    <p>Connected as @{x.platformUsername || x.displayName}</p>
                  ) : (
                    <p className="hint">
                      {accountsQuery.data?.configured.x
                        ? "Not connected"
                        : "Set X_CLIENT_ID / SECRET to enable"}
                    </p>
                  )}
                </div>
                {x ? (
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => disconnect.mutate("x")}
                  >
                    Disconnect
                  </button>
                ) : (
                  <a
                    className="nav-cta"
                    href="/api/social/x/start?returnTo=/connections"
                  >
                    Connect
                  </a>
                )}
              </li>
            </ul>
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
