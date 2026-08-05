import { Suspense } from "react";
import { TeamWorkspace } from "@/components/team-workspace";

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="page-shell" />}>
      <TeamWorkspace />
    </Suspense>
  );
}
