import { Suspense } from "react";
import { ContactWorkspace } from "@/components/contact-workspace";
import { PageLoadingShell } from "@/components/ui-skeleton";

export const metadata = {
  title: "Contact Us — Ghost n Post",
  description: "Get in touch with the Ghost n Post team. We're here to answer questions, assist with enterprise plans, and take feedback.",
};

export default function ContactPage() {
  return (
    <Suspense fallback={<PageLoadingShell stamp="Contact" variant="form" />}>
      <ContactWorkspace />
    </Suspense>
  );
}
