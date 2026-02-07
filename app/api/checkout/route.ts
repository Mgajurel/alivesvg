import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getOrCreateUser } from "@/lib/user";
import type { PlanTier } from "@/types/database";

const PRICE_MAP: Record<string, { priceId: string; tier: PlanTier }> = {
  lifetime: {
    priceId: process.env.STRIPE_PRICE_ID_LIFETIME!,
    tier: "lifetime",
  },
  // Future: starter: { priceId: process.env.STRIPE_PRICE_ID_STARTER!, tier: "starter" },
};

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const tier = body.tier as string;

  const priceConfig = PRICE_MAP[tier];
  if (!priceConfig) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? undefined;
  const dbUser = await getOrCreateUser(userId, email);

  // Get or create Stripe customer
  let stripeCustomerId = dbUser.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await getStripe().customers.create({
      email: email,
      metadata: { clerk_id: userId },
    });
    stripeCustomerId = customer.id;

    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabaseAdmin
      .from("users")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", dbUser.id);
  }

  const session = await getStripe().checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "payment",
    line_items: [{ price: priceConfig.priceId, quantity: 1 }],
    success_url: `${request.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${request.headers.get("origin")}/checkout/cancel`,
    metadata: {
      clerk_id: userId,
      plan: priceConfig.tier,
    },
  });

  return NextResponse.json({ url: session.url });
}
