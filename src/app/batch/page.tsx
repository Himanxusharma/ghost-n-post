import { Suspense } from "react";
import { BatchWorkspace } from "@/components/batch-workspace";
import { PageLoadingShell } from "@/components/ui-skeleton";

export default function BatchPage() {
  return (
    <Suspense fallback={<PageLoadingShell stamp="Batch" variant="form" />}>
      <BatchWorkspace />
    </Suspense>
  );
}
