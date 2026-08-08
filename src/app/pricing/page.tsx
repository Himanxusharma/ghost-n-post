import { Suspense } from "react";
import { PricingWorkspace } from "@/components/pricing-workspace";
import { PageLoadingShell } from "@/components/ui-skeleton";

export const metadata = {
  title: "Pricing — Ghost n Post",
  description: "Simple, transparent pricing for creators and teams. Convert YouTube videos to platform-ready posts in your voice.",
};

export default function PricingPage() {
  return (
    <Suspense fallback={<PageLoadingShell stamp="Pricing" variant="form" />}>
      <PricingWorkspace />
    </Suspense>
  );
}
