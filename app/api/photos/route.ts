import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { put, del } from "@vercel/blob";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { moderatePhoto } from "@/lib/moderation";
import { publishApprovedPhoto } from "@/lib/photoActivation";
import { MAX_PROFILE_PHOTOS, MIN_PROFILE_PHOTOS, type ProfilePhoto } from "@/lib/types";

// Vercel Functions cap incoming request bodies at 4.5MB for server
// uploads — this must stay comfortably under that (base64 text runs ~4/3
// the size of the decoded image, plus a little JSON wrapper overhead), or
// the platform rejects the request before this route ever runs, which
// would show up as an opaque failure instead of a clear one.
const MAX_BASE64_LENGTH = 5_500_000;

const requestSchema = z.object({
  imageBase64: z.string().min(100).max(MAX_BASE64_LENGTH),
});

// The only place a photo's real moderationStatus is decided. A photo only
// ever lands in the public, profile-visible `photos` array when Vision
// actually returned "approved" here — never on a client-asserted value,
// and never by default when moderation is unavailable (see
// lib/moderation.ts's honest-fallback posture).
export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { imageBase64 } = parsed.data;

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }
  const existingPhotos: ProfilePhoto[] = userSnap.data()?.photos ?? [];
  if (existingPhotos.length >= MAX_PROFILE_PHOTOS) {
    return NextResponse.json({ error: `maximum ${MAX_PROFILE_PHOTOS} photos` }, { status: 400 });
  }

  const result = await moderatePhoto(imageBase64);
  const moderationStatus: ProfilePhoto["moderationStatus"] =
    result.status === "approved" ? "approved" : result.status === "rejected" ? "rejected" : "pending";

  const photoId = randomUUID();
  const { url } = await put(`users/${uid}/photos/${photoId}.jpg`, Buffer.from(imageBase64, "base64"), {
    access: "public",
    contentType: "image/jpeg",
  });

  // Full history (including rejected/pending) is kept privately for the
  // owner to see their own submission status — never exposed to other
  // users, unlike the public `photos` array below.
  await userRef.collection("photoSubmissions").doc(photoId).set({
    id: photoId,
    url,
    moderationStatus,
    reason: result.reason ?? null,
    createdAt: new Date().toISOString(),
  });

  if (moderationStatus === "approved") {
    await publishApprovedPhoto(uid, { id: photoId, url, moderationStatus: "approved" });
  }

  return NextResponse.json({
    status: moderationStatus,
    reason: result.reason ?? null,
    url: moderationStatus === "approved" ? url : null,
  });
}

const deleteSchema = z.object({ photoId: z.string().min(1) });

// Removes a photo the owner no longer wants, from both the public
// `photos` array (what everyone else sees) and the private
// photoSubmissions history (what the owner's own upload grid renders) --
// leaving it in either place would show it in one screen but not the
// other. If this drops an already-active profile back under
// MIN_PROFILE_PHOTOS, status reverts to pending_review: the "at least N
// approved photos" rule is an ongoing invariant of being visible, not a
// one-time gate that stops mattering once cleared.
export async function DELETE(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { photoId } = parsed.data;

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  const submissionRef = userRef.collection("photoSubmissions").doc(photoId);
  const submissionSnap = await submissionRef.get();
  const submissionUrl = submissionSnap.exists ? (submissionSnap.data()?.url as string | undefined) : undefined;

  const existingPhotos: ProfilePhoto[] = userSnap.data()?.photos ?? [];
  const remainingPhotos = existingPhotos.filter((p) => p.id !== photoId);
  const status = userSnap.data()?.status;

  const update: Record<string, unknown> = { photos: remainingPhotos };
  if (status === "active" && remainingPhotos.length < MIN_PROFILE_PHOTOS) {
    update.status = "pending_review";
  }

  await Promise.all([
    userRef.update(update),
    submissionSnap.exists ? submissionRef.delete() : Promise.resolve(),
    submissionUrl ? del(submissionUrl).catch(() => {}) : Promise.resolve(),
  ]);

  return NextResponse.json({ deleted: true });
}
