// /app/api/contact-exchange/route.ts
// The Safe Connect Bridge — blueprint Step 3.
//
// Cross-border couples move to LINE or WhatsApp. That is not a leak to
// be plugged; it is the point of the product. Refusing to acknowledge it
// only means the handoff happens anyway, as a phone number typed into a
// message where nobody consented and nothing is logged.
//
// Everything below is enforced here rather than in the chat UI, for the
// usual reason: a client can be edited, and every rule in this flow is a
// safety rule rather than a cosmetic one.
//
//   GET   — the state of this match's exchange, plus whether the gate is
//           open. Never returns the other side's handle before consent.
//   POST  — request (requester shares theirs) / accept (recipient shares
//           back, both revealed) / decline (silent).

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { moderateText } from "@/lib/moderation";
import { notifyUser } from "@/lib/notify";
import {
  CONTACT_EXCHANGE_MIN_MESSAGES,
  isContactChannel,
  type ContactExchange,
  type Match,
  type Message,
} from "@/lib/types";

// One live exchange per match. A deterministic id means a double-tap
// cannot create two pending requests, which would otherwise let someone
// spam the accept card by repeatedly asking.
const exchangeId = (matchId: string) => matchId;

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    matchId: z.string().min(1),
    channel: z.string().min(1),
    handle: z.string().trim().min(2).max(80),
  }),
  z.object({
    action: z.literal("accept"),
    matchId: z.string().min(1),
    handle: z.string().trim().min(2).max(80),
  }),
  z.object({ action: z.literal("decline"), matchId: z.string().min(1) }),
]);

/**
 * Both sides must have sent at least CONTACT_EXCHANGE_MIN_MESSAGES.
 *
 * Mutual rather than a combined total, deliberately: five messages one
 * person sent into silence is not a conversation, and that exact
 * asymmetry is what a spammer produces. A total would let someone
 * monologue their way to a contact-request button.
 */
async function conversationQualifies(matchId: string, userIds: string[]) {
  const snap = await adminDb
    .collection("messages")
    .where("matchId", "==", matchId)
    .get();

  const counts = new Map<string, number>(userIds.map((id) => [id, 0]));
  snap.docs.forEach((d) => {
    const msg = d.data() as Message;
    // Flagged messages don't count toward the gate. Otherwise the fastest
    // route to someone's contact details would be five abusive ones.
    if (msg.flagged) return;
    counts.set(msg.senderId, (counts.get(msg.senderId) ?? 0) + 1);
  });

  const qualifies = userIds.every((id) => (counts.get(id) ?? 0) >= CONTACT_EXCHANGE_MIN_MESSAGES);
  return { qualifies, counts };
}

async function loadMatch(matchId: string, uid: string) {
  const snap = await adminDb.collection("matches").doc(matchId).get();
  if (!snap.exists) return { error: NextResponse.json({ error: "match not found" }, { status: 404 }) };
  const match = snap.data() as Match;
  if (!match.userIds.includes(uid)) {
    return { error: NextResponse.json({ error: "not a participant" }, { status: 403 }) };
  }
  const otherId = match.userIds.find((id) => id !== uid);
  if (!otherId) return { error: NextResponse.json({ error: "match malformed" }, { status: 500 }) };

  // Same both-directions block check the message route does. Without it,
  // someone you blocked could still push a contact card at you — the one
  // notification that most looks like it came from a person.
  const [iBlockedThem, theyBlockedMe] = await Promise.all([
    adminDb.collection("blocks").doc(`${uid}_${otherId}`).get(),
    adminDb.collection("blocks").doc(`${otherId}_${uid}`).get(),
  ]);
  if (iBlockedThem.exists || theyBlockedMe.exists) {
    return {
      error: NextResponse.json({ error: "this conversation is no longer available" }, { status: 403 }),
    };
  }

  return { match, otherId };
}

export async function GET(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const matchId = new URL(request.url).searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const loaded = await loadMatch(matchId, uid);
  if ("error" in loaded) return loaded.error;

  const [{ qualifies, counts }, snap] = await Promise.all([
    conversationQualifies(matchId, loaded.match.userIds),
    adminDb.collection("contactExchanges").doc(exchangeId(matchId)).get(),
  ]);

  const exchange = snap.exists ? (snap.data() as ContactExchange) : null;

  // Handles are revealed only once accepted. A pending request therefore
  // leaks nothing at all if it is declined or simply ignored — which is
  // what makes declining a safe action rather than a confrontation.
  const revealed =
    exchange?.status === "accepted"
      ? {
          theirs: exchange.requesterId === uid ? exchange.recipientHandle : exchange.requesterHandle,
          mine: exchange.requesterId === uid ? exchange.requesterHandle : exchange.recipientHandle,
          channel: exchange.channel,
        }
      : null;

  return NextResponse.json({
    unlocked: qualifies,
    sentByMe: counts.get(uid) ?? 0,
    required: CONTACT_EXCHANGE_MIN_MESSAGES,
    status: exchange?.status ?? null,
    iAmRequester: exchange ? exchange.requesterId === uid : false,
    channel: exchange?.channel ?? null,
    revealed,
  });
}

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const { action, matchId } = parsed.data;
  const loaded = await loadMatch(matchId, uid);
  if ("error" in loaded) return loaded.error;
  const { match, otherId } = loaded;

  const ref = adminDb.collection("contactExchanges").doc(exchangeId(matchId));
  const existing = await ref.get();
  const exchange = existing.exists ? (existing.data() as ContactExchange) : null;
  const now = new Date().toISOString();

  if (action === "request") {
    if (!isContactChannel(parsed.data.channel)) {
      return NextResponse.json({ error: "unsupported channel" }, { status: 400 });
    }
    // A declined exchange can be re-requested; a pending or accepted one
    // cannot, so this can never be used to re-prompt someone who has
    // already answered.
    if (exchange && exchange.status !== "declined") {
      return NextResponse.json({ error: "already requested" }, { status: 409 });
    }

    const { qualifies } = await conversationQualifies(matchId, match.userIds);
    if (!qualifies) {
      return NextResponse.json(
        { error: "conversation_too_short", required: CONTACT_EXCHANGE_MIN_MESSAGES },
        { status: 403 },
      );
    }

    // A handle is free text and goes to another person, so it gets the
    // same moderation as a message. Otherwise "add me: <abuse>" is a
    // message that skips the message filter entirely.
    const verdict = moderateText(parsed.data.handle);
    if (verdict.flagged) {
      return NextResponse.json({ error: "handle_rejected" }, { status: 422 });
    }

    const record: ContactExchange = {
      id: exchangeId(matchId),
      matchId,
      requesterId: uid,
      recipientId: otherId,
      channel: parsed.data.channel,
      requesterHandle: parsed.data.handle,
      status: "pending",
      createdAt: now,
    };
    await ref.set(record);

    await notifyUser(
      otherId,
      "Contact details offered",
      "Someone you matched with would like to swap contacts.",
    ).catch(() => {});

    return NextResponse.json({ status: "pending" });
  }

  if (action === "accept") {
    if (!exchange || exchange.status !== "pending") {
      return NextResponse.json({ error: "nothing to accept" }, { status: 409 });
    }
    // Only the recipient can accept. Without this the requester could
    // accept their own request and reveal the other person's handle —
    // except there would be none to reveal, which is the tell that this
    // check is really about not letting the flow reach a broken state.
    if (exchange.recipientId !== uid) {
      return NextResponse.json({ error: "not yours to accept" }, { status: 403 });
    }

    const verdict = moderateText(parsed.data.handle);
    if (verdict.flagged) {
      return NextResponse.json({ error: "handle_rejected" }, { status: 422 });
    }

    await ref.update({
      recipientHandle: parsed.data.handle,
      status: "accepted",
      respondedAt: now,
    });

    await notifyUser(
      exchange.requesterId,
      "Contacts shared",
      "Your match accepted and shared their details.",
    ).catch(() => {});

    return NextResponse.json({ status: "accepted" });
  }

  // decline — silent by design. The requester is not notified: telling
  // someone they were turned down invites a second attempt through
  // another channel, and the person declining gains nothing from it.
  if (!exchange || exchange.status !== "pending") {
    return NextResponse.json({ error: "nothing to decline" }, { status: 409 });
  }
  if (exchange.recipientId !== uid) {
    return NextResponse.json({ error: "not yours to decline" }, { status: 403 });
  }
  await ref.update({ status: "declined", respondedAt: now });
  return NextResponse.json({ status: "declined" });
}
