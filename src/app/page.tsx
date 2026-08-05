import { Suspense } from "react";
import { HomeWorkspace } from "@/components/home-workspace";
import { HomeLoadingShell } from "@/components/ui-skeleton";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoadingShell />}>
      <HomeWorkspace />
    </Suspense>
  );
}
