// /app/api/stripe/checkout/route.ts
// Starts a subscription. Returns a Stripe-hosted Checkout URL for the
// caller to redirect to — card details never touch this app, which is
// what keeps it out of PCI scope.
//
// Nothing here grants paid access. The only thing that ever flips
// subscriptionStatus to "active" is a signature-verified webhook (see
// ../webhook/route.ts): a client that reaches the success_url has not
// necessarily paid, and could just navigate there directly.

import { NextResponse } from "next/server";
import { verifyRequestUser, adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import type { UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "billing is not configured" }, { status: 503 });
  }

  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }
  const profile = userSnap.data() as UserProfile;

  // Already paying — sending them through Checkout again would create a
  // second subscription on the same account and bill them twice.
  if (profile.subscriptionStatus === "active") {
    return NextResponse.json({ error: "already subscribed" }, { status: 409 });
  }

  const stripe = getStripe();

  try {
  // Reuse the customer across attempts. Without this, every abandoned
  // Checkout leaves behind another customer record for the same person,
  // and the webhook's customer -> user lookup stops being one-to-one.
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    // The profile document has no email of its own (see lib/types.ts) —
    // the account's email lives on the Firebase Auth user. Worth passing:
    // it's what Stripe puts on the receipt and what makes a customer
    // findable in the Stripe dashboard by a human.
    const authUser = await adminAuth.getUser(uid).catch(() => null);
    const customer = await stripe.customers.create({
      email: authUser?.email ?? undefined,
      name: profile.displayName,
      // The mapping the webhook relies on when an event carries no
      // subscription metadata of its own.
      metadata: { firebaseUid: uid },
    });
    customerId = customer.id;
    await userRef.update({ stripeCustomerId: customerId });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID as string, quantity: 1 }],
    // Both point back into Browse: the whole reason someone subscribes is
    // to keep liking, so landing anywhere else adds a step.
    success_url: `${appUrl}/browse?subscribed=1`,
    cancel_url: `${appUrl}/browse`,
    client_reference_id: uid,
    // Copied onto the Subscription itself, not just the Checkout Session —
    // later lifecycle events (renewal, cancellation, payment failure)
    // arrive as subscription events that never reference the session.
    subscription_data: { metadata: { firebaseUid: uid } },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json({ error: "could not start checkout" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
  } catch (err) {
    // Any Stripe call above can throw — a revoked key, a price id that
    // doesn't resolve, a network failure. Uncaught, they surfaced as a
    // bare 500 in the browser console, which tells whoever is debugging
    // nothing about which of those it was. Same classification the price
    // route uses, and the same rule: never echo Stripe's message, since
    // an invalid_request quotes back the value it was handed.
    const stripeError = err as { type?: string; code?: string };
    console.error("stripe checkout failed:", err);
    return NextResponse.json(
      {
        error: "could not start checkout",
        reason:
          stripeError.type === "StripeAuthenticationError"
            ? "stripe_key_rejected"
            : stripeError.code === "resource_missing"
              ? "stripe_price_missing"
              : "stripe_error",
      },
      { status: 502 },
    );
  }
}
