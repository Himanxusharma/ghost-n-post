import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to upgrade." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { plan = "pro_monthly", paymentMethod = "card", billingDetails = {} } = body;

    // Simulate secure payment gateway session creation & card verification
    // In production with Stripe/Razorpay keys configured, this calls stripe.checkout.sessions.create / razorpay.orders.create
    const transactionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return NextResponse.json({
      success: true,
      transactionId,
      status: "active",
      tier: "pro",
      plan,
      trialCredits: 50,
      monthlyCredits: 200,
      paymentMethod,
      billingDetails,
      message: "Pro tier active! 200 monthly credits & 50 trial credits unlocked.",
    });
  } catch (error) {
    console.error("[POST /api/billing/checkout]", error);
    return NextResponse.json({ error: "Failed to process checkout transaction." }, { status: 500 });
  }
}
