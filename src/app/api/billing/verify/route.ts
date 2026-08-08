import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to verify payment." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan = "pro_monthly",
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required Razorpay payment verification parameters." },
        { status: 400 },
      );
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Razorpay payment signature. Payment verification failed." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      status: "active",
      tier: "pro",
      plan,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      trialCredits: 50,
      monthlyCredits: 200,
      message: "Payment verified successfully! Pro tier activated with 200 monthly credits.",
    });
  } catch (error) {
    console.error("[POST /api/billing/verify]", error);
    return NextResponse.json(
      { error: "Failed to verify Razorpay payment." },
      { status: 500 },
    );
  }
}
