import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/env";

/**
 * Public crawler rules. App/auth utility routes are disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getPublicAppUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in", "/sign-up"],
        disallow: [
          "/api/",
          "/sso-callback",
          "/history",
          "/connections",
          "/scheduled",
          "/batch",
          "/analytics",
          "/extension",
          "/team",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
