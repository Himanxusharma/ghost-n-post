import { Suspense } from "react";
import { TeamWorkspace } from "@/components/team-workspace";
import { PageLoadingShell } from "@/components/ui-skeleton";

export default function TeamPage() {
  return (
    <Suspense fallback={<PageLoadingShell stamp="Team" variant="form" />}>
      <TeamWorkspace />
    </Suspense>
  );
}
