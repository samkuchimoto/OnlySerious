// /app/api/stripe/portal/route.ts
// Stripe-hosted billing portal: update the card, see invoices, cancel.
//
// Not optional polish. A recurring charge a person can start in two taps
// but can't stop without emailing support is the kind of thing that
// generates chargebacks and app-store rejections. Cancellation flows back
// in through the webhook as customer.subscription.deleted/updated, so
// access follows automatically without anything else to keep in sync.

import { NextResponse } from "next/server";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
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

  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }
  const profile = userSnap.data() as UserProfile;

  if (!profile.stripeCustomerId) {
    return NextResponse.json({ error: "no billing account" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
