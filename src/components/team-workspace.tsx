"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { StyleSettingsModal } from "@/components/style-settings-modal";
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
  }>;
  invites: Array<{
    id: string;
    email: string;
    role: string;
    expiresAt: string;
  }>;
};

export function TeamWorkspace() {
  const [styleOpen, setStyleOpen] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("auto");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error: Error) => setStatus(error.message),
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
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error: Error) => setStatus(error.message),
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
      setLastInviteUrl(data.acceptUrl);
      setStatus(`Invite ready for ${data.email}`);
      queryClient.invalidateQueries({ queryKey: ["team", activeTeamId] });
    },
    onError: (error: Error) => setStatus(error.message),
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
      queryClient.invalidateQueries({ queryKey: ["team", activeTeamId] });
    },
    onError: (error: Error) => setStatus(error.message),
  });

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
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      window.history.replaceState({}, "", "/team");
    },
    onError: (error: Error) => setStatus(error.message),
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
        <header className="history-header">
          <p className="brand-sm">Ghost n Post</p>
          <h1>Team</h1>
          <p>Shared workspace for drafts, invites, and default language.</p>
          <Link href="/" className="text-link">
            ← Back to drafts
          </Link>
        </header>

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
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Content studio"
              required
              minLength={2}
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
          <button type="submit" disabled={createTeam.isPending || !name.trim()}>
            {createTeam.isPending ? "Creating…" : "Create team"}
          </button>
        </form>

        <section className="team-section">
          <h2>Your teams</h2>
          {teamsQuery.isLoading ? <p className="hint">Loading teams…</p> : null}
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
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="hint">No teams yet — create one above.</p>
          )}
        </section>

        {detailQuery.data ? (
          <section className="team-section">
            <h2>{detailQuery.data.team.name}</h2>
            <p className="hint">
              Members and pending invites for this workspace.
            </p>

            <ul className="connection-list">
              {detailQuery.data.members.map((member) => (
                <li key={member.id}>
                  <div>
                    <h2>{member.userId}</h2>
                    <p>{member.role}</p>
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
                  disabled={invite.isPending || !inviteEmail.trim()}
                >
                  {invite.isPending ? "Sending…" : "Create invite link"}
                </button>
              </form>
            ) : null}

            {lastInviteUrl ? (
              <p className="hint">
                Share this link:{" "}
                <a href={lastInviteUrl} className="text-link">
                  {lastInviteUrl}
                </a>
              </p>
            ) : null}

            {detailQuery.data.invites.length ? (
              <ul className="connection-list">
                {detailQuery.data.invites.map((row) => (
                  <li key={row.id}>
                    <div>
                      <h2>{row.email}</h2>
                      <p>
                        {row.role} · expires{" "}
                        {new Date(row.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    {canAdmin ? (
                      <button
                        type="button"
                        className="btn-quiet"
                        onClick={() => revoke.mutate(row.id)}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {status ? <p className="hint">{status}</p> : null}
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
