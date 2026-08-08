import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getRazorpayClient, getRazorpayKeys } from "@/lib/razorpay";

const PRICE_MAP: Record<
  string,
  Record<"monthly" | "annual", { amount: number; currency: string }>
> = {
  INR: {
    monthly: { amount: 29900, currency: "INR" }, // ₹299
    annual: { amount: 299900, currency: "INR" }, // ₹2,999
  },
  USD: {
    monthly: { amount: 399, currency: "USD" }, // $3.99
    annual: { amount: 3900, currency: "USD" }, // $39
  },
  EUR: {
    monthly: { amount: 349, currency: "EUR" }, // €3.49
    annual: { amount: 3500, currency: "EUR" }, // €35
  },
  GBP: {
    monthly: { amount: 299, currency: "GBP" }, // £2.99
    annual: { amount: 2900, currency: "GBP" }, // £29
  },
};

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to upgrade." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { billingCycle = "monthly", currency = "INR" } = body;

    const selectedCurrency = (currency as string).toUpperCase();
    const cycle = billingCycle === "annual" ? "annual" : "monthly";
    const pricing = PRICE_MAP[selectedCurrency]?.[cycle] || PRICE_MAP.INR[cycle];

    const rzp = getRazorpayClient();
    const { keyId } = getRazorpayKeys();

    if (rzp) {
      // Call official Razorpay orders.create API
      const order = await rzp.orders.create({
        amount: pricing.amount,
        currency: pricing.currency,
        receipt: `rcpt_${user.userId.slice(-8)}_${Date.now()}`,
        notes: {
          userId: user.userId,
          plan: `pro_${cycle}`,
          prelaunchOffer: "true",
        },
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      });
    }

    // Mock fallback when RAZORPAY_KEY_SECRET is not configured in local environment
    const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return NextResponse.json({
      success: true,
      orderId: mockOrderId,
      amount: pricing.amount,
      currency: pricing.currency,
      keyId: keyId || "rzp_test_mock_key_id",
      isMock: true,
    });
  } catch (error) {
    console.error("[POST /api/billing/create-order]", error);
    return NextResponse.json(
      { error: "Failed to create Razorpay payment order." },
      { status: 500 },
    );
  }
}
