"use client";

import Image from "next/image";

type ThumbImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Use for above-the-fold / active job thumbs only. */
  priority?: boolean;
  sizes?: string;
};

/**
 * Optimized thumbnail: Next Image + lazy loading by default.
 * Falls back to native lazy <img> for unknown hosts (avoids config churn).
 */
export function ThumbImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
}: ThumbImageProps) {
  if (!canOptimize(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes ?? `${width}px`}
      priority={priority}
      loading={priority ? undefined : "lazy"}
    />
  );
}

function canOptimize(src: string): boolean {
  try {
    const { hostname, protocol } = new URL(src);
    if (protocol !== "https:") return false;
    return (
      hostname === "i.ytimg.com" ||
      hostname === "img.youtube.com" ||
      hostname.endsWith(".blob.vercel-storage.com") ||
      hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}
