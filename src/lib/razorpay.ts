import crypto from "crypto";
import Razorpay from "razorpay";

export function getRazorpayKeys() {
  const keyId =
    process.env.RAZORPAY_KEY_ID?.trim() ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

  return { keyId, keySecret, isConfigured: Boolean(keyId && keySecret) };
}

export function getRazorpayClient(): Razorpay | null {
  const { keyId, keySecret, isConfigured } = getRazorpayKeys();
  if (!isConfigured) return null;

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Verify Razorpay payment signature using timing-safe HMAC SHA256 comparison.
 * signature = hmac_sha256(order_id + "|" + payment_id, secret)
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getRazorpayKeys();

  // If orderId starts with mock_ and keys are not configured, accept demo signature in dev
  if (orderId.startsWith("order_mock_") && !keySecret) {
    return true;
  }

  if (!keySecret || !signature || typeof signature !== "string") return false;

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSignature, "utf-8");
  const actualBuf = Buffer.from(signature, "utf-8");

  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verify Razorpay Webhook signature sent in X-Razorpay-Signature header.
 */
export function verifyRazorpayWebhookSignature({
  rawBody,
  webhookSignature,
  webhookSecret,
}: {
  rawBody: string;
  webhookSignature: string;
  webhookSecret: string;
}): boolean {
  if (!webhookSecret || !webhookSignature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSignature, "utf-8");
  const actualBuf = Buffer.from(webhookSignature, "utf-8");

  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
