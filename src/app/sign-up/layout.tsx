import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "One Google click. Your ghostwriter starts remembering you.",
  robots: { index: true, follow: true },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
