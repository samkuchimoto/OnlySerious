import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { notifyUser } from "@/lib/notify";
import { FREE_DAILY_LIKE_LIMIT, PAID_DAILY_LIKE_LIMIT, type Match, type UserProfile } from "@/lib/types";

const requestSchema = z.object({
  likedUserId: z.string().min(1),
});

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// The only place a like's daily limit is enforced — a client can't just
// skip its own cap, since users/{uid} blocks client writes to
// dailyLikesUsed/dailyLikesDate (see firestore.rules).
export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { likedUserId } = parsed.data;
  if (likedUserId === uid) {
    return NextResponse.json({ error: "can't like your own profile" }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }
  const profile = userSnap.data() as UserProfile;

  // Deterministic id (mirrors Block/Hide's `${a}_${b}` pattern) instead
  // of a random one — makes "like the same profile twice" structurally
  // impossible (an overwrite of the same doc, not a second one), where
  // a randomUUID() id let Browse re-showing an already-liked profile
  // (it didn't exclude your own likes) silently create duplicates.
  const likeId = `${uid}_${likedUserId}`;
  const likeRef = adminDb.collection("likes").doc(likeId);
  const reciprocalRef = adminDb.collection("likes").doc(`${likedUserId}_${uid}`);

  const existingLike = await likeRef.get();
  if (existingLike.exists) {
    // Already liked — a harmless re-click (e.g. a stale Browse list),
    // not a new like. No daily-limit consumption, no repeat
    // notification, just report the current state.
    const reciprocal = await reciprocalRef.get();
    const today = todayKey();
    const usedToday = profile.dailyLikesDate === today ? (profile.dailyLikesUsed ?? 0) : 0;
    const limit = profile.subscriptionStatus === "active" ? PAID_DAILY_LIKE_LIMIT : FREE_DAILY_LIKE_LIMIT;
    return NextResponse.json({ liked: true, matched: reciprocal.exists, remaining: limit - usedToday });
  }

  const today = todayKey();
  const usedBeforeToday = profile.dailyLikesDate === today ? (profile.dailyLikesUsed ?? 0) : 0;
  // Applied by subscriptionStatus, never by gender — see the comment on
  // FREE_DAILY_LIKE_LIMIT in lib/types.ts.
  const limit = profile.subscriptionStatus === "active" ? PAID_DAILY_LIKE_LIMIT : FREE_DAILY_LIKE_LIMIT;
  if (usedBeforeToday >= limit) {
    return NextResponse.json({ error: "daily like limit reached", remaining: 0 }, { status: 429 });
  }

  await likeRef.set({
    id: likeId,
    likerId: uid,
    likedId: likedUserId,
    createdAt: new Date().toISOString(),
  });
  await userRef.update({ dailyLikesUsed: usedBeforeToday + 1, dailyLikesDate: today });

  // Mutual like → real match. A direct doc get on the same deterministic
  // id shape, not a query.
  const reciprocal = await reciprocalRef.get();

  let matched = false;
  if (reciprocal.exists) {
    matched = true;
    const matchId = [uid, likedUserId].sort().join("_");
    const matchRef = adminDb.collection("matches").doc(matchId);
    if (!(await matchRef.get()).exists) {
      const match: Match = { id: matchId, userIds: [uid, likedUserId].sort() as [string, string], createdAt: new Date().toISOString() };
      await matchRef.set(match);
    }
  }

  if (matched) {
    await notifyUser(likedUserId, "It's a match!", `You and ${profile.displayName} liked each other.`);
  } else {
    await notifyUser(likedUserId, "New like", `${profile.displayName} liked your profile.`);
  }

  return NextResponse.json({ liked: true, matched, remaining: limit - (usedBeforeToday + 1) });
}
