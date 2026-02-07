import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";
import type { PlanTier } from "@/types/database";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from("processed_events")
    .select("event_id")
    .eq("event_id", event.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const clerkId = session.metadata?.clerk_id;
    const plan = session.metadata?.plan as PlanTier | undefined;

    if (clerkId && plan) {
      const user = await getOrCreateUser(clerkId);

      // Update user plan
      await supabaseAdmin
        .from("users")
        .update({ plan, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      // Record purchase
      await supabaseAdmin.from("purchases").insert({
        user_id: user.id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        plan,
        amount_cents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        status: "completed",
      });
    }
  }

  // Mark event as processed
  await supabaseAdmin
    .from("processed_events")
    .insert({ event_id: event.id });

  return NextResponse.json({ received: true });
}
