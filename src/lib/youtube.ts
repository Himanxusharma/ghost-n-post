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
 *
 * Prefer timedtext caption tracks (more reliable than getTranscript, which
 * often 400s). Fall back to the panel transcript API when tracks are missing.
 */
export async function fetchCaptionsTranscript(
  youtubeId: string,
): Promise<TranscriptResult | null> {
  const fromTracks = await fetchCaptionsFromTracks(youtubeId);
  if (fromTracks) return fromTracks;

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

/**
 * Pull captions via player captionTracks → timedtext JSON3.
 * Works for many videos where getTranscript() fails.
 */
async function fetchCaptionsFromTracks(
  youtubeId: string,
): Promise<TranscriptResult | null> {
  try {
    const yt = await getClient();
    // TV / WEB often expose caption tracks more reliably than default client.
    let info;
    try {
      info = await yt.getBasicInfo(youtubeId, { client: "TV" });
    } catch {
      info = await yt.getBasicInfo(youtubeId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks: any[] =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (info as any)?.captions?.caption_tracks ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (info as any)?.captions?.player_captions_tracklist_renderer
        ?.caption_tracks ??
      [];

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return null;
    }

    const preferred =
      tracks.find(
        (t) => t.language_code === "en" && t.kind !== "asr",
      ) ||
      tracks.find((t) => String(t.language_code ?? "").startsWith("en")) ||
      tracks.find((t) => t.kind !== "asr") ||
      tracks[0];

    const baseUrl: string | undefined =
      preferred?.base_url || preferred?.baseUrl || preferred?.url;
    if (!baseUrl) return null;

    const timedUrl = baseUrl.includes("fmt=")
      ? baseUrl
      : `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}fmt=json3`;

    const response = await fetch(timedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      events?: Array<{
        tStartMs?: number;
        segs?: Array<{ utf8?: string }>;
      }>;
    };

    const parsed = (payload.events ?? [])
      .map((event) => {
        const text = (event.segs ?? [])
          .map((seg) => seg.utf8 ?? "")
          .join("")
          .replace(/\n/g, " ")
          .trim();
        return {
          start: String(event.tStartMs ?? 0),
          text,
        };
      })
      .filter((segment) => segment.text.length > 0);

    if (parsed.length === 0) return null;

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

  // Prefer chooseFormat + decipher — getStreamingData often returns undeciphered URLs.
  const clients = ["TV", "WEB"] as const;
  let lastError: unknown;

  for (const client of [...clients, null] as const) {
    try {
      const info = client
        ? await yt.getBasicInfo(youtubeId, { client })
        : await yt.getBasicInfo(youtubeId);

      const format = info.chooseFormat({
        type: "audio",
        quality: "bestefficiency",
      });

      if (!format) continue;

      // Already-deciphered URL, or decipher via player.
      const url =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (format as any).url ||
        (typeof format.decipher === "function"
          ? format.decipher(yt.session.player)
          : null);

      if (typeof url === "string" && url.startsWith("http")) {
        return url;
      }
    } catch (error) {
      lastError = error;
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : "No valid URL to decipher";
  throw new Error(
    `Could not resolve an audio stream URL for this video (${detail}). ` +
      "Try a video with captions enabled, or configure Deepgram after YouTube stream access works.",
  );
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
