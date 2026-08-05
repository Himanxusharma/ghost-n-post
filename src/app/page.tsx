import { Suspense } from "react";
import { HomeWorkspace } from "@/components/home-workspace";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="page-shell" />}>
      <HomeWorkspace />
    </Suspense>
  );
}
