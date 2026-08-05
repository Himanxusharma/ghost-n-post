import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Batch",
};

export default function BatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
