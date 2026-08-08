import { NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const webhookSignature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "";

    if (!webhookSecret) {
      console.warn("[POST /api/billing/webhook] RAZORPAY_WEBHOOK_SECRET is omitted.");
      return NextResponse.json({ received: true, note: "Webhook secret not set" });
    }

    const isValid = verifyRazorpayWebhookSignature({
      rawBody,
      webhookSignature,
      webhookSecret,
    });

    if (!isValid) {
      console.error("[POST /api/billing/webhook] Invalid Razorpay webhook signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 },
      );
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const payment = payload.payload?.payment?.entity;
    const order = payload.payload?.order?.entity;

    console.log(`[POST /api/billing/webhook] Verified event: ${event}`, {
      paymentId: payment?.id,
      orderId: order?.id,
      amount: payment?.amount,
      status: payment?.status,
    });

    // Handle payment events
    switch (event) {
      case "payment.captured":
      case "order.paid":
        // Asynchronously confirm subscription status in database if needed
        break;

      case "payment.failed":
        console.warn(`[POST /api/billing/webhook] Payment failed: ${payment?.id}`);
        break;

      default:
        break;
    }

    return NextResponse.json({ received: true, event });
  } catch (error) {
    console.error("[POST /api/billing/webhook]", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
