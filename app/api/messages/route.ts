import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { moderateText } from "@/lib/moderation";
import { notifyUser } from "@/lib/notify";
import { FREE_OPENING_COOLDOWN_MS, type Match, type Message, type UserProfile } from "@/lib/types";

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

  // Blocking never deleted the match, and this route only ever checked
  // participation — so a blocked person could keep sending messages to
  // the person who blocked them, and they arrived as push notifications.
  // Checked in both directions off the deterministic block ids, so it's
  // two doc gets rather than a query.
  const otherUserId = match.userIds.find((id) => id !== uid);
  if (otherUserId) {
    const [iBlockedThem, theyBlockedMe] = await Promise.all([
      adminDb.collection("blocks").doc(`${uid}_${otherUserId}`).get(),
      adminDb.collection("blocks").doc(`${otherUserId}_${uid}`).get(),
    ]);
    if (iBlockedThem.exists || theyBlockedMe.exists) {
      // Deliberately the same message either way: telling someone "you
      // have been blocked" hands a harasser a confirmation they can act
      // on. It just reads as a conversation that's no longer available.
      return NextResponse.json({ error: "this conversation is no longer available" }, { status: 403 });
    }
  }

  // The messaging gate — free accounts may open one new conversation
  // every twelve hours, and may always reply. See lib/types.ts for why
  // it is scoped to openings rather than applied to every message, and
  // why it is not gender-conditional.
  //
  // Enforced here and nowhere else — the countdown the client renders is
  // a courtesy, and a client that skipped it would still be refused
  // here, the same way the daily like limit works (app/api/likes).
  const senderRef = adminDb.collection("users").doc(uid);
  const senderSnap = await senderRef.get();
  const sender = senderSnap.data() as UserProfile | undefined;
  const isSubscriber = sender?.subscriptionStatus === "active";

  // Has the other side ever spoken here? If so this is a reply, and a
  // reply is never throttled. Two equality filters, which Firestore
  // serves from single-field indexes — no composite index needed.
  let isReply = false;
  if (otherUserId) {
    const theirs = await adminDb
      .collection("messages")
      .where("matchId", "==", matchId)
      .where("senderId", "==", otherUserId)
      .limit(1)
      .get();
    isReply = !theirs.empty;
  }

  const gated = !isSubscriber && !isReply;

  if (gated && sender?.lastOpenedConversationAt) {
    const elapsed = Date.now() - new Date(sender.lastOpenedConversationAt).getTime();
    // A negative elapsed would mean a clock skew wrote a future
    // timestamp; treating it as "wait" rather than "allow" fails closed.
    if (elapsed < FREE_OPENING_COOLDOWN_MS) {
      return NextResponse.json(
        {
          error: "message cooldown",
          retryAfterMs: FREE_OPENING_COOLDOWN_MS - elapsed,
          // Lets the chat screen say "you can reply to anyone who has
          // written to you" rather than implying messaging is frozen
          // outright, which is what the bare 429 read as.
          scope: "opening",
        },
        { status: 429 },
      );
    }
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

  // Starts the next cooldown, but only for a message that actually
  // opened a conversation — otherwise replying to someone would silently
  // consume the twelve-hour window that is meant to govern cold
  // outreach, and a busy conversation would lock its own participant out
  // of ever starting another.
  //
  // Written for subscribers too, so the field stays truthful if a
  // subscription later lapses — otherwise a cancelled member would carry
  // a stale timestamp and get one free opening with no wait.
  const update: Record<string, string> = { lastMessageAt: message.createdAt };
  if (!isReply) update.lastOpenedConversationAt = message.createdAt;
  await senderRef.update(update);

  if (otherUserId) {
    const senderName = sender?.displayName ?? "Someone";
    await notifyUser(otherUserId, senderName, text.length > 80 ? `${text.slice(0, 80)}…` : text);
  }

  // Lets the client start its countdown from the authoritative clock
  // rather than guessing from its own. Zero for a reply, because a reply
  // did not spend the opening window.
  const cooldownMs = isSubscriber || isReply ? 0 : FREE_OPENING_COOLDOWN_MS;
  return NextResponse.json({ sent: true, flagged, cooldownMs });
}
