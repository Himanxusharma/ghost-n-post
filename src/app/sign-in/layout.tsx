import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Save the drafts. Keep the voice. Ship from here.",
  robots: { index: true, follow: true },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
