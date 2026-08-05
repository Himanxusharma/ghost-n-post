import { Suspense } from "react";
import { BatchWorkspace } from "@/components/batch-workspace";

export default function BatchPage() {
  return (
    <Suspense fallback={<div className="page-shell" />}>
      <BatchWorkspace />
    </Suspense>
  );
}
