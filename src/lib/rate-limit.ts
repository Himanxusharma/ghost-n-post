import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isProductionRuntime } from "@/lib/auth/authorize";

/**
 * Rate limit for /api/generate.
 * Fail-open in local/dev when Upstash is unset; fail-closed in production.
 */
export async function limitGenerate(identifier: string): Promise<{
  success: boolean;
  remaining: number;
}> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (isProductionRuntime()) {
      return { success: false, remaining: 0 };
    }
    return { success: true, remaining: 999 };
  }

  const ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "ghost-n-post:generate",
  });

  const result = await ratelimit.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}
