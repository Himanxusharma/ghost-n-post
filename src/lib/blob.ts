import { put } from "@vercel/blob";

/** Upload a text or binary payload to Vercel Blob and return its public URL. */
export async function uploadBlob(
  pathname: string,
  body: string | Buffer | Blob,
  contentType: string,
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const result = await put(pathname, body, {
    access: "public",
    contentType,
    token,
    addRandomSuffix: true,
  });

  return result.url;
}

/** Fetch a remote image and store it in Blob (thumbnails). */
export async function mirrorRemoteImage(
  pathname: string,
  sourceUrl: string,
): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  return uploadBlob(pathname, buffer, contentType);
}
