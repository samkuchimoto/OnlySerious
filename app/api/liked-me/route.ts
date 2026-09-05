// /app/api/liked-me/route.ts
// "Who liked you" — ThaiFriendly's paywall, enforced on the server.
//
// This route exists because the paywall has to be real. The page used to
// read the likes collection straight from the client, so gating it in the
// UI would have been decoration: anyone could open devtools, run the same
// Firestore query, and read every liker. firestore.rules no longer lets a
// client read likes addressed to it, so this is the only way in, and a
// free account never receives the identities at all.
//
// What a free account gets is the count and nothing else — no names, no
// photos, no ages, no cities. A blurred-but-present photo (visually
// closer to ThaiFriendly) would mean sending the real image URL to the
// browser and blurring it in CSS, which is a paywall you defeat by
// reading the network tab. On a platform whose pitch to women is that it
// is careful with them, leaking their photos to every non-paying man is
// not a trade worth making.

import { NextResponse } from "next/server";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { LIKED_ME_REQUIRES_SUBSCRIPTION, type Like, type UserProfile } from "@/lib/types";

export async function GET(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ownSnap = await adminDb.collection("users").doc(uid).get();
  if (!ownSnap.exists) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }
  const own = ownSnap.data() as UserProfile;

  const [likeSnap, blockedByMe, blockedMe, hiddenByMe, likedByMe] = await Promise.all([
    adminDb.collection("likes").where("likedId", "==", uid).get(),
    adminDb.collection("blocks").where("blockerId", "==", uid).get(),
    adminDb.collection("blocks").where("blockedId", "==", uid).get(),
    adminDb.collection("hides").where("hiderId", "==", uid).get(),
    adminDb.collection("likes").where("likerId", "==", uid).get(),
  ]);

  const excludedIds = new Set([
    ...blockedByMe.docs.map((d) => d.data().blockedId as string),
    ...blockedMe.docs.map((d) => d.data().blockerId as string),
    ...hiddenByMe.docs.map((d) => d.data().hiddenId as string),
  ]);
  const alreadyLiked = new Set(likedByMe.docs.map((d) => d.data().likedId as string));

  // Resolved before the paywall check, not after — the count a free
  // account is shown has to be the same number it would see after
  // paying. Counting raw like documents would include blocked, paused
  // and deleted people, and promise more than the upgrade delivers.
  const visible: Array<{ like: Like; liker: UserProfile }> = [];
  await Promise.all(
    likeSnap.docs.map(async (d) => {
      const like = d.data() as Like;
      if (excludedIds.has(like.likerId)) return;
      const likerSnap = await adminDb.collection("users").doc(like.likerId).get();
      if (!likerSnap.exists) return;
      const liker = likerSnap.data() as UserProfile;
      if (liker.status !== "active" || liker.paused) return;
      visible.push({ like, liker });
    }),
  );

  if (LIKED_ME_REQUIRES_SUBSCRIPTION && own.subscriptionStatus !== "active") {
    return NextResponse.json({ locked: true, count: visible.length, likes: [] });
  }

  return NextResponse.json({
    locked: false,
    count: visible.length,
    likes: visible.map(({ like, liker }) => ({
      id: like.id,
      likerId: liker.id,
      displayName: liker.displayName,
      headline: liker.headline,
      birthdate: liker.birthdate,
      city: liker.city,
      photoUrl: liker.photos?.[0]?.url ?? null,
      selfieVerified: liker.selfieVerified ?? false,
      photoCount: liker.photos?.length ?? 0,
      lastActiveAt: liker.lastActiveAt ?? null,
      // Whether I've already liked them back, so the UI can show a match
      // instead of inviting a like that has already happened.
      matched: alreadyLiked.has(liker.id),
    })),
  });
}
