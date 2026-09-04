// /lib/stripe.ts
// Server-only Stripe client — imported inside app/api/stripe/** routes
// only, never into a "use client" file. Lazy-initialized for the same
// reason lib/firebaseAdmin.ts is: `next build` imports every route module
// to collect its exports, and that must not require a live secret key.
//
// apiVersion is deliberately NOT passed. The installed SDK pins its own
// (see node_modules/stripe/esm/apiVersion.d.ts) and its bundled types are
// generated against exactly that version — hardcoding a different string
// here is how you get types that silently disagree with the wire format
// after an SDK bump.

import Stripe from "stripe";

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    client = new Stripe(key);
  }
  return client;
}

// Checked before any route tries to talk to Stripe, so a half-configured
// deployment returns a clean "billing isn't set up" instead of a 500 with
// a stack trace. Both are required: a secret key with no price to sell is
// just as broken as no key at all.
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

// Stripe's subscription statuses don't map 1:1 onto the four this app
// stores (lib/types.ts), so the mapping lives here rather than being
// re-derived at each webhook event.
//
// "trialing" counts as active on purpose — someone in a trial has working
// access, and treating them as free would revoke it mid-trial. "incomplete"
// stays free: the first payment hasn't succeeded yet, so nothing has been
// bought. Anything unrecognized falls through to "free", i.e. the app
// fails closed (no paid access) rather than open.
export function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
): "free" | "active" | "past_due" | "canceled" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "free";
  }
}
