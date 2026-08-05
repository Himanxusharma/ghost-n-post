import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep heavy Node-only SDKs out of the client/edge bundles.
  serverExternalPackages: [
    "youtubei.js",
    "groq-sdk",
    "@deepgram/sdk",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
