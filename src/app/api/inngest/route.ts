import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { syncAnalytics } from "@/inngest/functions/analytics";
import { processBatch } from "@/inngest/functions/batch";
import { generateVideoPosts } from "@/inngest/functions/generate-posts";
import {
  publishNow,
  publishScheduled,
} from "@/inngest/functions/publish";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateVideoPosts,
    publishNow,
    publishScheduled,
    processBatch,
    syncAnalytics,
  ],
});
