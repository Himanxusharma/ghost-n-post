import { Innertube, UniversalCache } from "youtubei.js";
import { extractYoutubeId } from "@/lib/youtube-id";

export type VideoMetadata = {
  youtubeId: string;
  title: string;
  channelName: string;
  durationSeconds: number;
  thumbnailUrl: string;
  isPrivate: boolean;
  isLive: boolean;
};

export type TranscriptResult = {
  text: string;
  source: "captions" | "stt";
  segments: Array<{ start: string; text: string }>;
};

type CaptionSegment = {
  type?: string;
  start_ms?: string;
  start_time_text?: { toString(): string };
  snippet?: { toString(): string };
};

let innertubePromise: Promise<Innertube> | null = null;

async function getClient(): Promise<Innertube> {
  if (!innertubePromise) {
    innertubePromise = Innertube.create({
      cache: new UniversalCache(false),
    });
  }
  return innertubePromise;
}

/** Prefer highest-resolution thumbnail; fall back to hqdefault. */
export function pickThumbnailUrl(
  thumbnails: Array<{ url: string; width?: number }> | undefined,
  youtubeId: string,
): string {
  if (thumbnails?.length) {
    const sorted = [...thumbnails].sort(
      (a, b) => (b.width ?? 0) - (a.width ?? 0),
    );
    if (sorted[0]?.url) {
      return sorted[0].url;
    }
  }
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export async function fetchVideoMetadata(
  youtubeUrl: string,
): Promise<VideoMetadata> {
  const youtubeId = extractYoutubeId(youtubeUrl);
  if (!youtubeId) {
    throw new Error("Invalid YouTube URL");
  }

  const yt = await getClient();
  const info = await yt.getBasicInfo(youtubeId);
  const playability = info.playability_status?.status;

  if (playability && playability !== "OK") {
    const reason =
      info.playability_status?.reason ||
      "This video is unavailable (private, age-restricted, or region-locked).";
    throw new Error(reason);
  }

  const basic = info.basic_info;

  return {
    youtubeId,
    title: basic.title ?? "Untitled video",
    channelName: basic.author ?? basic.channel?.name ?? "Unknown channel",
    durationSeconds: basic.duration ?? 0,
    thumbnailUrl: pickThumbnailUrl(basic.thumbnail, youtubeId),
    isPrivate: Boolean(basic.is_private),
    isLive: Boolean(basic.is_live || basic.is_live_content),
  };
}

/**
 * Try creator/auto captions first. Returns null when none are available
 * so the caller can fall back to URL-based STT.
 */
export async function fetchCaptionsTranscript(
  youtubeId: string,
): Promise<TranscriptResult | null> {
  try {
    const yt = await getClient();
    const info = await yt.getInfo(youtubeId);
    const transcriptInfo = await info.getTranscript();
    const segments =
      (transcriptInfo.transcript?.content?.body?.initial_segments ??
        []) as CaptionSegment[];

    const parsed = segments
      .filter((segment) => segment?.type === "TranscriptSegment")
      .map((segment) => ({
        start:
          segment.start_ms ??
          segment.start_time_text?.toString?.() ??
          "",
        text: segment.snippet?.toString?.()?.trim() ?? "",
      }))
      .filter((segment) => segment.text.length > 0);

    if (parsed.length === 0) {
      return null;
    }

    return {
      text: parsed.map((s) => s.text).join(" "),
      source: "captions",
      segments: parsed,
    };
  } catch {
    return null;
  }
}

/** Resolve a streaming audio URL for Deepgram to pull directly. */
export async function resolveAudioStreamUrl(
  youtubeId: string,
): Promise<string> {
  const yt = await getClient();
  const format = await yt.getStreamingData(youtubeId, {
    type: "audio",
    quality: "bestefficiency",
  });

  if (!format?.url) {
    throw new Error("Could not resolve an audio stream URL for this video");
  }

  return format.url;
}

export type ChannelVideoSummary = {
  youtubeId: string;
  title: string;
  url: string;
};

/** Resolve a channel URL/handle/@name/UC… id into recent public uploads. */
export async function listChannelVideos(
  channelInput: string,
  maxVideos: number,
): Promise<{ channelId: string; channelTitle: string; videos: ChannelVideoSummary[] }> {
  const yt = await getClient();
  const trimmed = channelInput.trim();
  let channelId: string | null = null;

  // Direct channel id
  if (/^UC[\w-]{20,}$/.test(trimmed)) {
    channelId = trimmed;
  } else {
    try {
      const url = new URL(
        trimmed.startsWith("http") ? trimmed : `https://www.youtube.com/${trimmed.replace(/^\/+/, "")}`,
      );
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "channel" && parts[1]) {
        channelId = parts[1];
      } else if (parts[0]?.startsWith("@") || parts[0] === "c" || parts[0] === "user") {
        const query = parts[0].startsWith("@")
          ? parts[0]
          : parts[1]
            ? `@${parts[1]}`
            : trimmed;
        const search = await yt.search(query, { type: "channel" });
        const first = search.results?.find(
          (item) => item?.type === "Channel",
        ) as { id?: string } | undefined;
        channelId = first?.id ?? null;
      }
    } catch {
      // fall through to search
    }
  }

  if (!channelId) {
    const search = await yt.search(trimmed, { type: "channel" });
    const first = search.results?.find(
      (item) => item?.type === "Channel",
    ) as { id?: string } | undefined;
    channelId = first?.id ?? null;
  }

  if (!channelId) {
    throw new Error("Could not resolve that YouTube channel");
  }

  const channel = await yt.getChannel(channelId);
  const channelTitle =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (channel as any)?.metadata?.title ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (channel as any)?.header?.title?.toString?.() ||
    "YouTube channel";

  const videosFeed = await channel.getVideos();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = videosFeed?.videos ?? [];
  const videos: ChannelVideoSummary[] = [];

  for (const item of items) {
    const id = item?.id || item?.video_id;
    if (!id || typeof id !== "string") continue;
    videos.push({
      youtubeId: id,
      title: item?.title?.toString?.() || item?.title?.text || "Untitled",
      url: `https://www.youtube.com/watch?v=${id}`,
    });
    if (videos.length >= maxVideos) break;
  }

  if (videos.length === 0) {
    throw new Error("No public uploads found for that channel");
  }

  return { channelId, channelTitle: String(channelTitle), videos };
}
