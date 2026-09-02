import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { moderateText } from "@/lib/moderation";
import { notifyUser } from "@/lib/notify";
import type { Match, Message, UserProfile } from "@/lib/types";

const requestSchema = z.object({
  matchId: z.string().min(1),
  text: z.string().trim().min(1).max(2000),
});

// The only place a message's `flagged` value is decided — a client can
// never assert its own message is clean, since messages/{id} is
// server-write-only (see firestore.rules). Sending always goes through
// here, even though reading is a direct client Firestore listener.
export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { matchId, text } = parsed.data;

  const matchSnap = await adminDb.collection("matches").doc(matchId).get();
  if (!matchSnap.exists) {
    return NextResponse.json({ error: "match not found" }, { status: 404 });
  }
  const match = matchSnap.data() as Match;
  if (!match.userIds.includes(uid)) {
    return NextResponse.json({ error: "not a participant in this match" }, { status: 403 });
  }

  const { flagged } = moderateText(text);

  const messageId = randomUUID();
  const message: Message = {
    id: messageId,
    matchId,
    senderId: uid,
    text,
    createdAt: new Date().toISOString(),
    flagged,
  };
  await adminDb.collection("messages").doc(messageId).set(message);

  const otherId = match.userIds.find((id) => id !== uid);
  if (otherId) {
    const senderSnap = await adminDb.collection("users").doc(uid).get();
    const senderName = (senderSnap.data() as UserProfile | undefined)?.displayName ?? "Someone";
    await notifyUser(otherId, senderName, text.length > 80 ? `${text.slice(0, 80)}…` : text);
  }

  return NextResponse.json({ sent: true, flagged });
}
