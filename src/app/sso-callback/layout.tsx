import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Signing in",
};

export default function SSOCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
