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
            stamp="V2 Feature"
            title="Social connections"
            description="Direct OAuth platform connections for automated publishing will unlock in Version 2.0."
            backHref="/"
            backLabel="← New draft"
          />

          <div className="v2-lock-card">
            <span className="v2-badge">🔒 LOCKED FOR V2</span>
            <h3>Social Account Connections Launching in Version 2.0</h3>
            <p>
              Direct LinkedIn & X account connections for automated social posting will unlock in V2. For now, generate posts in the Studio and use 1-click <strong>Copy</strong> to post directly!
            </p>
            <div style={{ marginTop: "1rem" }}>
              <a href="/" className="tool-btn tool-btn-primary">
                ← Return to Draft Studio
              </a>
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
    </div>
  );
}
