import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isStripeConfigured } from "@/lib/stripe";

// Point an uptime monitor (UptimeRobot, Better Stack, etc. — free tier
// checking every 1-5 min) at this URL and have it text/email/Slack you
// the moment it stops returning 200. Detecting an outage in minutes
// instead of "a user mentioned it" is the actual lever a solo developer
// has — not preventing every possible failure.
// Whether billing env vars are present on *this* deployment — booleans
// only, never the values. Deliberately does not affect the status code:
// a deploy with billing not yet switched on is not an outage, and making
// it one would have the uptime monitor paging about a config gap. It's
// here because "is Stripe actually configured on prod" is otherwise a
// question you can only answer by digging through the Vercel dashboard.
function billingHealth() {
  return {
    configured: isStripeConfigured(),
    webhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  };
}

export async function GET() {
  try {
    await adminDb.collection("users").limit(1).get();
    return NextResponse.json({
      status: "ok",
      firestore: "ok",
      billing: billingHealth(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("health check: Firestore unreachable", err);
    return NextResponse.json(
      { status: "degraded", firestore: "unreachable", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
