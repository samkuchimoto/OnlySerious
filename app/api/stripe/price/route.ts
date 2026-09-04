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
    console.error("stripe price lookup failed:", err);
    return NextResponse.json({ error: "price unavailable" }, { status: 502 });
  }
}
