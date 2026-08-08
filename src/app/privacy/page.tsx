import { Suspense } from "react";
import { PrivacyWorkspace } from "@/components/privacy-workspace";
import { PageLoadingShell } from "@/components/ui-skeleton";

export const metadata = {
  title: "Privacy Policy — Ghost n Post",
  description: "Read Ghost n Post's Privacy Policy to understand how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <Suspense fallback={<PageLoadingShell stamp="Privacy" variant="form" />}>
      <PrivacyWorkspace />
    </Suspense>
  );
}
