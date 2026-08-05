import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { publications, type Publication } from "@/db/schema";
import { getValidLinkedInAccount, publishToLinkedIn } from "@/lib/social/linkedin";
import { getValidXAccount, publishToX } from "@/lib/social/x";

export async function executePublication(
  publicationId: string,
): Promise<Publication> {
  const db = getDb();
  const publication = await db.query.publications.findFirst({
    where: eq(publications.id, publicationId),
  });

  if (!publication) {
    throw new Error("Publication not found");
  }

  if (publication.status === "published") {
    return publication;
  }

  if (publication.status === "cancelled") {
    throw new Error("Publication was cancelled");
  }

  await db
    .update(publications)
    .set({
      status: "publishing",
      updatedAt: new Date(),
      errorMessage: null,
    })
    .where(eq(publications.id, publicationId));

  try {
    let result: { externalPostId: string; externalUrl: string };

    if (publication.platform === "linkedin") {
      const account = await getValidLinkedInAccount(publication.userId);
      result = await publishToLinkedIn({
        account,
        commentary: publication.content,
        imageUrls: publication.mediaUrls,
      });
    } else {
      const account = await getValidXAccount(publication.userId);
      const thread =
        publication.threadParts.length > 0
          ? publication.threadParts
          : [publication.content];
      result = await publishToX({
        account,
        text: publication.content,
        threadParts: thread,
        imageUrls: publication.mediaUrls,
      });
    }

    const [updated] = await db
      .update(publications)
      .set({
        status: "published",
        publishedAt: new Date(),
        externalPostId: result.externalPostId,
        externalUrl: result.externalUrl,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(publications.id, publicationId))
      .returning();

    return updated;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Publish failed";
    const [failed] = await db
      .update(publications)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(publications.id, publicationId))
      .returning();
    throw new Error(failed.errorMessage || message);
  }
}
