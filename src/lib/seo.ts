import type { Metadata } from "next";
import { getPublicAppUrl } from "@/lib/env";

export const SITE_NAME = "Ghost n Post";
export const SITE_TAGLINE = "AI ghostwriter for video";
export const SITE_DESCRIPTION =
  "Turn any YouTube video into a ready-to-publish LinkedIn or X post in your own voice.";

export function absoluteUrl(path = "/"): string {
  const base = getPublicAppUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(getPublicAppUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  keywords: [
    "YouTube to LinkedIn",
    "AI ghostwriter",
    "social media posts",
    "content repurposing",
    "X Twitter drafts",
  ],
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

/** Authenticated / utility surfaces should not be indexed. */
export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};
