import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Extension",
};

export default function ExtensionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
