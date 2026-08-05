import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a Ghost n Post account with Google to unlock history, style profiles, and teams.",
  robots: { index: true, follow: true },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
