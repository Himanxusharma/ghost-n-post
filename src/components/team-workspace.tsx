"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
import { ListSkeleton } from "@/components/ui-skeleton";
import { useToast } from "@/components/toast";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "@/lib/content";

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  defaultLanguage: string;
};

type TeamDetail = {
  team: {
    id: string;
    name: string;
    slug: string;
    defaultLanguage: string;
  };
  role: "owner" | "admin" | "member";
  members: Array<{
    id: string;
    userId: string;
    role: string;
    email?: string | null;
    displayName?: string | null;
    label?: string;
  }>;
  invites: Array<{
    id: string;
    email: string;
    role: string;
    token?: string;
    expiresAt: string;
  }>;
};

export function TeamWorkspace() {
  const [styleOpen, setStyleOpen] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("auto");
  const [inviteEmail, setInviteEmail] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopyInvite = async (url: string, id: string = "last") => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(id);
      success("Copied to clipboard!", "Team invite link copied to clipboard.");
      setTimeout(() => setCopiedToken(null), 2500);
    } catch {
      toastError("Copy failed", "Please copy the link manually.");
    }
  };
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams");
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data as { teams: TeamRow[]; activeTeamId: string | null };
    },
  });

  const activeTeamId =
    selectedTeamId ??
    teamsQuery.data?.activeTeamId ??
    teamsQuery.data?.teams[0]?.id ??
    null;

  const detailQuery = useQuery({
    queryKey: ["team", activeTeamId],
    enabled: Boolean(activeTeamId),
    queryFn: async (): Promise<TeamDetail> => {
      const response = await fetch(`/api/teams/${activeTeamId}`);
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data;
    },
  });

  const createTeam = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, defaultLanguage: language }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data;
    },
    onSuccess: (team) => {
      setName("");
      setSelectedTeamId(team.id);
      setStatus(`Created ${team.name}`);
      success("Team created", team.name);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error: Error) => {
      setStatus(error.message);
      toastError("Could not create team", error.message);
    },
  });

  const setActive = useMutation({
    mutationFn: async (teamId: string | null) => {
      const response = await fetch("/api/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data;
    },
    onSuccess: () => {
      setStatus("Active workspace updated");
      success("Active workspace updated");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error: Error) => {
      setStatus(error.message);
      toastError("Update failed", error.message);
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!activeTeamId) throw new Error("Select a team first");
      const response = await fetch(`/api/teams/${activeTeamId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: "member" }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data as { acceptUrl: string; email: string };
    },
    onSuccess: (data) => {
      setInviteEmail("");
      const cleanUrl = data.acceptUrl.replace(
        /^https?:\/\/[^/]+/,
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "https://www.ghostnpost.com",
      );
      setLastInviteUrl(cleanUrl);
      setStatus(`Invite ready for ${data.email}`);
      success("Invite ready", data.email);
      queryClient.invalidateQueries({ queryKey: ["team", activeTeamId] });
    },
    onError: (error: Error) => {
      setStatus(error.message);
      toastError("Invite failed", error.message);
    },
  });

  const revoke = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await fetch("/api/teams/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
    },
    onSuccess: () => {
      setStatus("Invite revoked");
      success("Invite revoked");
      queryClient.invalidateQueries({ queryKey: ["team", activeTeamId] });
    },
    onError: (error: Error) => {
      setStatus(error.message);
      toastError("Revoke failed", error.message);
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (team: { id: string; name: string }) => {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data as { id: string; name: string };
    },
    onSuccess: (data) => {
      if (selectedTeamId === data.id) {
        setSelectedTeamId(null);
      }
      setLastInviteUrl(null);
      setStatus(`Deleted ${data.name}`);
      success("Team deleted", data.name);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.removeQueries({ queryKey: ["team", data.id] });
    },
    onError: (error: Error) => {
      setStatus(error.message);
      toastError("Delete failed", error.message);
    },
  });

  function confirmDeleteTeam(team: { id: string; name: string }) {
    const ok = window.confirm(
      `Delete “${team.name}”? This removes the workspace, members, and pending invites. Drafts stay in your history.`,
    );
    if (!ok) return;
    deleteTeamMutation.mutate(team);
  }

  const acceptInvite = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch("/api/teams/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data as { teamId: string };
    },
    onSuccess: (data) => {
      setSelectedTeamId(data.teamId);
      setStatus("Invite accepted");
      success("Invite accepted");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      window.history.replaceState({}, "", "/team");
    },
    onError: (error: Error) => {
      setStatus(error.message);
      toastError("Invite failed", error.message);
    },
  });

  useEffect(() => {
    if (inviteToken && !acceptInvite.isPending && !acceptInvite.isSuccess) {
      acceptInvite.mutate(inviteToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accept once per token
  }, [inviteToken]);

  function onCreate(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    createTeam.mutate();
  }

  function onInvite(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    invite.mutate();
  }

  const canAdmin =
    detailQuery.data?.role === "owner" || detailQuery.data?.role === "admin";

  return (
    <div className="page-shell">
      <SiteHeader onOpenStyle={() => setStyleOpen(true)} />
      <main id="main-content" className="history-page" tabIndex={-1}>
        <div className="page-panel">
          <PageHeader
            stamp="Team"
            title="Team"
            description="Shared voice. Shared queue. Fewer Slack pings."
            backHref="/"
            backLabel="← Back to drafts"
          />

          {inviteToken ? (
          <p className="hint">
            {acceptInvite.isPending
              ? "Accepting invite…"
              : acceptInvite.isError
                ? (acceptInvite.error as Error).message
                : "Invite accepted."}
          </p>
        ) : null}

        <form className="batch-form" onSubmit={onCreate}>
          <h2>Create team</h2>
          <label>
            Team name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Content studio"
              required
              minLength={2}
              autoComplete="organization"
            />
          </label>
          <label>
            Default language
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="btn-primary"
            disabled={createTeam.isPending || !name.trim()}
          >
            {createTeam.isPending ? "Creating…" : "Create team"}
          </button>
        </form>

        <section className="team-section">
          <h2>Your teams</h2>
          {teamsQuery.isLoading ? (
            <ListSkeleton rows={3} withThumb={false} />
          ) : null}
          {teamsQuery.isError ? (
            <p className="field-error" role="alert">
              {(teamsQuery.error as Error).message}
            </p>
          ) : null}
          {teamsQuery.data?.teams.length ? (
            <ul className="connection-list">
              {teamsQuery.data.teams.map((team) => {
                const isActive = teamsQuery.data.activeTeamId === team.id;
                const isSelected = activeTeamId === team.id;
                return (
                  <li key={team.id}>
                    <div>
                      <h2>
                        {team.name}{" "}
                        <span className="hint">({team.role})</span>
                      </h2>
                      <p>
                        /{team.slug} ·{" "}
                        {LANGUAGE_LABELS[
                          team.defaultLanguage as keyof typeof LANGUAGE_LABELS
                        ] ?? team.defaultLanguage}
                        {isActive ? " · active" : ""}
                      </p>
                    </div>
                    <div className="team-actions">
                      <button
                        type="button"
                        className="btn-quiet"
                        onClick={() => setSelectedTeamId(team.id)}
                      >
                        {isSelected ? "Selected" : "View"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActive.mutate(team.id)}
                        disabled={isActive || setActive.isPending}
                      >
                        {isActive ? "Active" : "Set active"}
                      </button>
                      {team.role === "owner" ? (
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() =>
                            confirmDeleteTeam({
                              id: team.id,
                              name: team.name,
                            })
                          }
                          disabled={deleteTeamMutation.isPending}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="hint">No teams yet. Create one above and invite the crew.</p>
          )}
        </section>

        {detailQuery.data ? (
          <section className="team-section">
            <header className="publish-header">
              <div>
                <h2>{detailQuery.data.team.name}</h2>
                <p className="hint">
                  Members and pending invites for this workspace.
                </p>
              </div>
              {detailQuery.data.role === "owner" ? (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() =>
                    confirmDeleteTeam({
                      id: detailQuery.data.team.id,
                      name: detailQuery.data.team.name,
                    })
                  }
                  disabled={deleteTeamMutation.isPending}
                >
                  {deleteTeamMutation.isPending
                    ? "Deleting…"
                    : "Delete team"}
                </button>
              ) : null}
            </header>

            <ul className="connection-list">
              {detailQuery.data.members.map((member) => (
                <li key={member.id}>
                  <div>
                    <h2>
                      {member.label ||
                        member.displayName ||
                        member.email ||
                        "Team member"}
                    </h2>
                    <p>
                      {member.role}
                      {member.email &&
                      (member.displayName || member.label) &&
                      member.email !== member.displayName
                        ? ` · ${member.email}`
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {canAdmin ? (
              <form className="batch-form" onSubmit={onInvite}>
                <h2>Invite teammate</h2>
                <label>
                  Email
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="teammate@company.com"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={invite.isPending || !inviteEmail.trim()}
                >
                  {invite.isPending ? "Sending…" : "Create invite link"}
                </button>
              </form>
            ) : null}

            {lastInviteUrl ? (
              <div className="invite-link-box" style={{ marginTop: "1.25rem", padding: "1rem", background: "#141618", border: "1px solid var(--accent)", borderRadius: "4px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)", display: "block", marginBottom: "0.5rem" }}>
                  ✨ Team Invite Link Ready:
                </span>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    readOnly
                    value={lastInviteUrl}
                    className="input-text"
                    style={{ flex: 1, minWidth: "220px", fontFamily: "var(--font-mono), monospace", fontSize: "0.85rem" }}
                  />
                  <button
                    type="button"
                    className="tool-btn tool-btn-primary"
                    onClick={() => handleCopyInvite(lastInviteUrl, "last")}
                  >
                    {copiedToken === "last" ? "✓ Copied!" : "📋 Copy Link"}
                  </button>
                </div>
              </div>
            ) : null}

            {detailQuery.data.invites.length ? (
              <ul className="connection-list" style={{ marginTop: "1.25rem" }}>
                {detailQuery.data.invites.map((row) => {
                  const rowUrl = row.token
                    ? `${typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://www.ghostnpost.com"}/team?invite=${row.token}`
                    : "";
                  return (
                    <li key={row.id}>
                      <div>
                        <h2>{row.email}</h2>
                        <p>
                          {row.role} · expires{" "}
                          {new Date(row.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        {rowUrl ? (
                          <button
                            type="button"
                            className="tool-btn"
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.775rem" }}
                            onClick={() => handleCopyInvite(rowUrl, row.id)}
                          >
                            {copiedToken === row.id ? "✓ Copied!" : "📋 Copy Link"}
                          </button>
                        ) : null}
                        {canAdmin ? (
                          <button
                            type="button"
                            className="btn-quiet"
                            onClick={() => revoke.mutate(row.id)}
                          >
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ) : null}

        {status ? <p className="hint">{status}</p> : null}
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
