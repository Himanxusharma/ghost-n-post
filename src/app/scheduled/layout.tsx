import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Scheduled",
};

export default function ScheduledLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
