import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { moderatePhoto } from "@/lib/moderation";
import { publishApprovedPhoto } from "@/lib/photoActivation";
import type { ProfilePhoto } from "@/lib/types";

const requestSchema = z.object({
  photoId: z.string().min(1),
});

// Re-runs moderation on a photo already sitting in "pending" (manual
// review) — the recovery path for the honest-fallback outcome, e.g. a
// transient Groq rate limit (real usage: uploading 3 photos back-to-back
// burns through the free-tier per-minute token budget). Only re-checks
// pending submissions — a confident "rejected" verdict isn't something a
// retry should be able to overturn, and there'd be nothing to re-check
// for an already-"approved" one.
export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { photoId } = parsed.data;

  const submissionRef = adminDb.collection("users").doc(uid).collection("photoSubmissions").doc(photoId);
  const submissionSnap = await submissionRef.get();
  if (!submissionSnap.exists) {
    return NextResponse.json({ error: "photo not found" }, { status: 404 });
  }
  const submission = submissionSnap.data() as { url: string; moderationStatus: string };
  if (submission.moderationStatus !== "pending") {
    return NextResponse.json({ error: "only a pending photo can be retried" }, { status: 400 });
  }

  const imageRes = await fetch(submission.url);
  if (!imageRes.ok) {
    return NextResponse.json({ error: "could not re-fetch photo" }, { status: 502 });
  }
  const imageBase64 = Buffer.from(await imageRes.arrayBuffer()).toString("base64");

  const result = await moderatePhoto(imageBase64);
  const moderationStatus: ProfilePhoto["moderationStatus"] =
    result.status === "approved" ? "approved" : result.status === "rejected" ? "rejected" : "pending";

  await submissionRef.update({ moderationStatus, reason: result.reason ?? null });

  if (moderationStatus === "approved") {
    await publishApprovedPhoto(uid, { id: photoId, url: submission.url, moderationStatus: "approved" });
  }

  return NextResponse.json({ status: moderationStatus, reason: result.reason ?? null });
}
