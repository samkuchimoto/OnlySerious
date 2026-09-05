// /app/api/stripe/price/route.ts
// The configured subscription price, read from Stripe itself so the
// checkout page can never advertise an amount that disagrees with what
// the customer is actually charged. Hardcoding "$10/month" in the UI is
// how a page ends up lying after someone edits the price in the Stripe
// dashboard.
//
// Unauthenticated on purpose: this is the public list price, the same
// number shown on Stripe's own Checkout page. Nothing customer-specific
// is returned.

import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "billing is not configured" }, { status: 503 });
  }

  try {
    const price = await getStripe().prices.retrieve(process.env.STRIPE_PRICE_ID as string);

    // unit_amount is in the currency's smallest unit (cents for USD,
    // satang for THB). Zero-decimal currencies like JPY are the
    // exception, which is why the divisor isn't a flat 100.
    const zeroDecimal = ["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"];
    const divisor = zeroDecimal.includes(price.currency) ? 1 : 100;

    return NextResponse.json({
      amount: price.unit_amount === null ? null : price.unit_amount / divisor,
      currency: price.currency.toUpperCase(),
      interval: price.recurring?.interval ?? null,
    });
  } catch (err) {
    // Almost always a STRIPE_PRICE_ID that isn't a real price id — the
    // most common setup mistake is pasting a product id (prod_...) or
    // some other object id instead of the price id (price_...).
    //
    // The hint reports only the *prefix* of the configured value, never
    // the value itself. Echoing it back would be a real leak if the
    // variable had been filled with a secret key by mistake — which is
    // exactly the sort of misconfiguration this endpoint exists to
    // catch.
    console.error("stripe price lookup failed:", err);
    const configured = process.env.STRIPE_PRICE_ID ?? "";
    const prefix = configured.split("_")[0];

    // Stripe's own error classification, which separates "your key is
    // bad" from "that id doesn't exist" — two failures that look
    // identical from the outside and have completely different fixes.
    // Only the type/code are surfaced, never the message: an
    // invalid_request message can quote back the value it was given,
    // which would leak a secret key if one had been pasted in by mistake.
    const stripeError = err as { type?: string; code?: string };
    const keyMode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_") ? "live" : "test";
    const priceMode = configured.includes("_live_") ? "live" : "test";

    let hint: string;
    if (!configured.startsWith("price_")) {
      hint = `STRIPE_PRICE_ID must start with "price_" but starts with "${prefix}_". A product id (prod_) is the usual mix-up — open the product, find the price row, and copy the price id.`;
    } else if (stripeError.type === "StripeAuthenticationError") {
      hint = `Stripe rejected the API key, not the price id. STRIPE_SECRET_KEY in Vercel is wrong or revoked — if you rotated the key, the new one was never saved here.`;
    } else if (stripeError.code === "resource_missing") {
      // The key works but the id doesn't resolve, which means the price
      // lives on a different account or mode than the key — a Stripe
      // Sandbox is a separate environment from standard test mode, and
      // copying an id from one while the key belongs to the other is the
      // usual cause. Rather than describe that, just list what this key
      // can actually see: price ids are not secrets, and the right value
      // is almost certainly in the list.
      const available = await getStripe()
        .prices.list({ limit: 5, active: true, expand: ["data.product"] })
        .then((res) =>
          res.data.map((p) => ({
            id: p.id,
            amount: p.unit_amount,
            currency: p.currency.toUpperCase(),
            interval: p.recurring?.interval ?? null,
            product:
              typeof p.product === "object" && p.product && "name" in p.product
                ? (p.product as { name?: string }).name
                : undefined,
          })),
        )
        .catch(() => null);

      hint =
        available && available.length > 0
          ? `Stripe has no price with that id on this account (key is ${keyMode} mode), but it does have the prices listed in availablePrices below — copy one of those ids into STRIPE_PRICE_ID.`
          : `Stripe has no price with that id, and this key can't see any active prices at all (key is ${keyMode} mode). The key and the product were almost certainly created in different environments — a Stripe Sandbox is separate from standard test mode. Create the product again in whichever one the key belongs to.`;

      return NextResponse.json(
        { error: "price unavailable", hint, availablePrices: available ?? [] },
        { status: 502 },
      );
    } else {
      hint = `Stripe refused the lookup (${stripeError.type ?? "unknown error"}${stripeError.code ? `, ${stripeError.code}` : ""}). Key is ${keyMode} mode and the price id looks like ${priceMode} mode.`;
    }
    return NextResponse.json({ error: "price unavailable", hint }, { status: 502 });
  }
}
