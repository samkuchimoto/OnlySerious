import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { put } from "@vercel/blob";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { moderatePhoto } from "@/lib/moderation";
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
    const approvedPhoto: ProfilePhoto = { id: photoId, url, moderationStatus: "approved" };
    const updatedPhotos = [...existingPhotos, approvedPhoto];
    const update: Record<string, unknown> = { photos: updatedPhotos };
    // Auto-activate once the one thing this pipeline actually checks is
    // satisfied — never touches a profile a human has already suspended.
    if (updatedPhotos.length >= MIN_PROFILE_PHOTOS && userSnap.data()?.status === "pending_review") {
      update.status = "active";
    }
    await userRef.update(update);
  }

  return NextResponse.json({
    status: moderationStatus,
    reason: result.reason ?? null,
    url: moderationStatus === "approved" ? url : null,
  });
}
