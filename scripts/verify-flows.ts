/**
 * Offline verification harness for Ghost n Post core flows.
 * Run: npx tsx scripts/verify-flows.ts
 */
import {
  generateRequestSchema,
  styleProfileRequestSchema,
} from "../src/lib/validations";
import { extractYoutubeId } from "../src/lib/youtube-id";
import { batchRequestSchema } from "../src/lib/batch/validations";
import { publishRequestSchema } from "../src/lib/social/validations";
import {
  detectLanguageFromText,
  isSupportedLanguage,
} from "../src/lib/language";
import { sanitizeReturnTo } from "../src/lib/auth/authorize";
import { safeRedirect } from "../src/lib/auth/safe-redirect";
import { slugifyTeamName } from "../src/lib/teams";

type Check = [string, boolean, string?];
const checks: Check[] = [];

function pass(name: string) {
  checks.push([name, true]);
}
function fail(name: string, detail?: string) {
  checks.push([name, false, detail]);
}

function expect(name: string, condition: boolean, detail?: string) {
  if (condition) pass(name);
  else fail(name, detail);
}

// --- YouTube URL validation (client + server) ---
expect(
  "accept watch URL",
  extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ") ===
    "dQw4w9WgXcQ",
);
expect(
  "accept short URL",
  extractYoutubeId("https://youtu.be/dQw4w9WgXcQ") === "dQw4w9WgXcQ",
);
expect(
  "accept shorts URL",
  extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ") ===
    "dQw4w9WgXcQ",
);
expect("reject non-youtube", extractYoutubeId("https://vimeo.com/123") === null);
expect("reject empty", extractYoutubeId("") === null);
expect("reject garbage", extractYoutubeId("not a url") === null);
expect(
  "reject bad id length",
  extractYoutubeId("https://youtu.be/short") === null,
);

const badGen = generateRequestSchema.safeParse({
  youtubeUrl: "https://example.com",
});
expect("generate rejects bad host", !badGen.success);

const longUrl = generateRequestSchema.safeParse({
  youtubeUrl: `https://www.youtube.com/watch?v=dQw4w9WgXcQ&${"x".repeat(600)}`,
});
expect("generate rejects oversized URL", !longUrl.success);

const goodGen = generateRequestSchema.safeParse({
  youtubeUrl: "  https://youtu.be/dQw4w9WgXcQ  ",
  language: "es",
});
expect(
  "generate trims + language",
  goodGen.success &&
    goodGen.data.youtubeUrl === "https://youtu.be/dQw4w9WgXcQ" &&
    goodGen.data.language === "es",
);

// --- Style profile validation ---
const styleShort = styleProfileRequestSchema.safeParse({
  samples: ["too short", "also short", "still short"],
});
expect("style rejects short samples", !styleShort.success);

const styleOk = styleProfileRequestSchema.safeParse({
  samples: [
    "A".repeat(25),
    "B".repeat(25),
    "C".repeat(25),
  ],
});
expect("style accepts 3 valid samples", styleOk.success);

const styleTooMany = styleProfileRequestSchema.safeParse({
  samples: Array.from({ length: 6 }, () => "X".repeat(25)),
});
expect("style rejects >5 samples", !styleTooMany.success);

// --- Batch validation ---
const batchEmpty = batchRequestSchema.safeParse({ type: "urls", urls: [] });
expect("batch rejects empty urls", !batchEmpty.success);

const batchBadUrl = batchRequestSchema.safeParse({
  type: "urls",
  urls: ["https://example.com/video"],
});
expect("batch rejects invalid youtube", !batchBadUrl.success);

const batchChannel = batchRequestSchema.safeParse({
  type: "channel",
  channelInput: "  ",
});
expect("batch rejects blank channel", !batchChannel.success);

const batchOk = batchRequestSchema.safeParse({
  type: "urls",
  urls: ["https://youtu.be/dQw4w9WgXcQ"],
  language: "fr",
});
expect("batch accepts valid urls + language", batchOk.success);

// --- Publish validation ---
const pubPast = publishRequestSchema.safeParse({
  platform: "linkedin",
  content: "hello",
  scheduledFor: "not-a-date",
});
expect("publish rejects bad datetime", !pubPast.success);

const pubOk = publishRequestSchema.safeParse({
  platform: "x",
  content: "hello world",
  includeCustomThumbnail: true,
});
expect("publish accepts custom thumb flag", pubOk.success);

const pubLong = publishRequestSchema.safeParse({
  platform: "linkedin",
  content: "x".repeat(12_001),
});
expect("publish rejects oversized content", !pubLong.success);

// --- Redirect sanitization ---
expect("returnTo allows relative", sanitizeReturnTo("/connections") === "/connections");
expect("returnTo blocks protocol-relative", sanitizeReturnTo("//evil.com") === "/connections");
expect("returnTo blocks absolute", sanitizeReturnTo("https://evil.com") === "/connections");
expect("returnTo blocks traversal", sanitizeReturnTo("/../secret") === "/connections");
expect(
  "returnTo allows query",
  sanitizeReturnTo("/?jobId=abc") === "/?jobId=abc",
);

// --- Language helpers ---
expect("detect hindi", detectLanguageFromText("यह परीक्षण है") === "hi");
expect("supported en", isSupportedLanguage("en"));
expect("unsupported xx", !isSupportedLanguage("xx"));

// --- Teams ---
expect("slugify team", slugifyTeamName(" Content Studio!!! ") === "content-studio");

// --- Auth decision matrix (pure) ---
function authorizeMatrix(input: {
  resourceUserId: string | null;
  callerId: string | null;
}) {
  if (!input.resourceUserId) return "allow-anon";
  if (!input.callerId) return "401";
  if (input.resourceUserId === input.callerId) return "allow-owner";
  return "403";
}
expect(
  "anon resource readable",
  authorizeMatrix({ resourceUserId: null, callerId: null }) === "allow-anon",
);
expect(
  "owned resource needs auth",
  authorizeMatrix({ resourceUserId: "u1", callerId: null }) === "401",
);
expect(
  "owner allowed",
  authorizeMatrix({ resourceUserId: "u1", callerId: "u1" }) === "allow-owner",
);
expect(
  "other user forbidden",
  authorizeMatrix({ resourceUserId: "u1", callerId: "u2" }) === "403",
);

// --- Google-only redirect sanitizer ---
expect("safeRedirect relative", safeRedirect("/history") === "/history");
expect("safeRedirect with query", safeRedirect("/batch?id=1") === "/batch?id=1");
expect("safeRedirect blocks protocol-relative", safeRedirect("//evil.com") === null);
expect("safeRedirect blocks absolute", safeRedirect("https://evil.com") === null);
expect("safeRedirect blocks traversal", safeRedirect("/../admin") === null);
expect("safeRedirect empty", safeRedirect("") === null);

// --- Production env URL helper (non-production fallback) ---
import { getPublicAppUrl } from "../src/lib/env";
expect(
  "public app url is absolute",
  /^https?:\/\//.test(getPublicAppUrl()),
);

const failed = checks.filter((c) => !c[1]);
for (const [name, ok, detail] of checks) {
  console.log(ok ? "PASS" : "FAIL", name, detail ?? "");
}
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) {
  process.exitCode = 1;
}
