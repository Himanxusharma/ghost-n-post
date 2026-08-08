import { Suspense } from "react";
import { TermsWorkspace } from "@/components/terms-workspace";
import { PageLoadingShell } from "@/components/ui-skeleton";

export const metadata = {
  title: "Terms & Conditions — Ghost n Post",
  description: "Read the Terms & Conditions governing your use of Ghost n Post services.",
};

export default function TermsPage() {
  return (
    <Suspense fallback={<PageLoadingShell stamp="Terms" variant="form" />}>
      <TermsWorkspace />
    </Suspense>
  );
}
