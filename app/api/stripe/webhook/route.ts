// /app/api/stripe/webhook/route.ts
// The single source of truth for subscriptionStatus. Every other part of
// the app reads that field; only this route writes it, and only after
// Stripe's signature over the raw request body verifies.
//
// Why the raw body matters: the signature is computed over the exact
// bytes Stripe sent. Parsing to JSON and re-serializing changes key order
// and whitespace, and verification then fails on a legitimate event —
// so this reads request.text() and never request.json(). (App Router
// route handlers hand over the untouched body; the Pages Router's
// `api.bodyParser: false` config has no equivalent here and isn't needed.)
//
// This endpoint is unauthenticated by necessity — Stripe calls it, not a
// signed-in user — which is exactly why the signature check is the first
// thing that happens and why a failure returns before any Firestore write.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebaseAdmin";
import { getStripe, isStripeConfigured, mapSubscriptionStatus } from "@/lib/stripe";
import { notifyUser } from "@/lib/notify";
import { BRAND_CONFIG } from "@/config/brand";
import { PAID_DAILY_LIKE_LIMIT, type UserProfile } from "@/lib/types";

// Resolves a Stripe object back to the Firestore user it belongs to.
// Prefers the metadata written at checkout; falls back to a lookup by
// customer id for anything created outside this app (a subscription
// started by hand in the Stripe dashboard, say). Returns null rather
// than guessing — writing paid access onto the wrong account is far
// worse than dropping one event.
async function findUserId(
  firebaseUid: string | undefined,
  customerId: string | undefined,
): Promise<string | null> {
  if (firebaseUid) return firebaseUid;
  if (!customerId) return null;
  const match = await adminDb
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  return match.empty ? null : match.docs[0].id;
}

async function applySubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const uid = await findUserId(subscription.metadata?.firebaseUid, customerId);
  if (!uid) {
    console.error("stripe webhook: no user for subscription", subscription.id);
    return;
  }

  const userRef = adminDb.collection("users").doc(uid);
  const nextStatus = mapSubscriptionStatus(subscription.status);

  // Read before writing, so the transition is known rather than just the
  // new value. Stripe sends subscription.updated for renewals and other
  // no-op changes too, and notifying on every one of those would mean a
  // "welcome" push every billing cycle.
  const beforeSnap = await userRef.get();
  const previousStatus = (beforeSnap.data() as UserProfile | undefined)?.subscriptionStatus;

  await userRef.update({
    subscriptionStatus: nextStatus,
    stripeSubscriptionId: subscription.id,
    ...(customerId ? { stripeCustomerId: customerId } : {}),
  });

  // Only on the actual free -> active transition.
  if (nextStatus === "active" && previousStatus !== "active") {
    await notifyUser(
      uid,
      `Welcome to ${BRAND_CONFIG.premiumName}`,
      `You now get ${PAID_DAILY_LIKE_LIMIT} likes a day, messaging with no wait, and you can see everyone who liked you.`,
    ).catch((err) => {
      // A failed push must never fail the webhook: returning non-2xx
      // would make Stripe retry an event whose Firestore write already
      // succeeded, and the person has paid either way.
      console.error("subscription welcome notification failed:", err);
    });
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "billing is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    // constructEventAsync, not constructEvent: the async form uses
    // WebCrypto and works on every runtime, so this route keeps verifying
    // correctly if it ever runs somewhere other than Node.
    event = await getStripe().webhooks.constructEventAsync(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    // A bad signature is either a misconfigured secret or a forged
    // request. Neither should reach the Firestore writes below.
    console.error("stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Fires the moment the first payment succeeds — the fastest path to
      // giving someone what they just paid for.
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!subscriptionId) break;
        // Re-fetched rather than trusted from the session: the session
        // carries an id, not the subscription's current status.
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        await applySubscription(subscription);
        break;
      }

      // Renewals, cancellations, payment failures, plan changes. Handling
      // all three with the same mapping is what keeps access correct over
      // time instead of only at the moment of purchase — without
      // `deleted`, a canceled subscriber would keep paid access forever.
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscription(event.data.object);
        break;
      }

      default:
        // Everything else is acknowledged and ignored on purpose —
        // returning non-2xx would make Stripe retry an event this app
        // has no handler for.
        break;
    }
  } catch (err) {
    // A 500 here tells Stripe to retry with backoff, which is what we
    // want for a transient Firestore failure. The handlers above are
    // idempotent (they set fields to a computed value rather than
    // incrementing), so a replayed event is harmless.
    console.error(`stripe webhook handler failed for ${event.type}:`, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
