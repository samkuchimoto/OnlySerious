import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// Point an uptime monitor (UptimeRobot, Better Stack, etc. — free tier
// checking every 1-5 min) at this URL and have it text/email/Slack you
// the moment it stops returning 200. Detecting an outage in minutes
// instead of "a user mentioned it" is the actual lever a solo developer
// has — not preventing every possible failure.
export async function GET() {
  try {
    await adminDb.collection("users").limit(1).get();
    return NextResponse.json({ status: "ok", firestore: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("health check: Firestore unreachable", err);
    return NextResponse.json(
      { status: "degraded", firestore: "unreachable", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
