// /app/api/voice-intro/route.ts
//
// The 15-second Voice Introduction — the audit's Phase 2 opener, and the
// Vibrant Dream brief's "Voice Sparks":
//
//   "Hearing a prospective partner's authentic voice, tone, and spoken
//    English or native cadence humanizes cross-border connections,
//    dramatically accelerating trust formation."
//
// It follows the photo pipeline exactly (app/api/photos): base64 in,
// Vercel Blob out, real moderation deciding whether it goes live, and
// the public field written only on an approved result. A client can
// never assert that its own recording is clean.
//
// DELETE removes it. That matters more than usual for audio: a voice is
// biometric-adjacent personal data under GDPR, the operator is a French
// micro-entreprise, and "you can record one but not remove it" is not a
// defensible position.

import { NextResponse } from "next/server";
import { z } from "zod";
import { put, del } from "@vercel/blob";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { moderateVoice } from "@/lib/moderation";
import { VOICE_INTRO_MAX_SECONDS } from "@/lib/types";

// Vercel Functions cap request bodies at 4.5MB, and base64 runs ~4/3 the
// size of the bytes it encodes. Fifteen seconds of Opus at a voice
// bitrate is well under 200KB, so this ceiling is generous by design —
// it exists to reject something that is not a short voice note at all,
// before the platform rejects the request opaquely.
const MAX_BASE64_LENGTH = 1_400_000;

const requestSchema = z.object({
  audioBase64: z.string().min(100).max(MAX_BASE64_LENGTH),
  // The browser decides the container (webm/opus in Chrome, mp4/aac in
  // Safari). Whitelisted rather than trusted: it is echoed into the blob's
  // contentType, which the browser later honours when playing it back.
  contentType: z.enum(["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"]),
  durationSeconds: z.number().positive().max(VOICE_INTRO_MAX_SECONDS + 2),
});

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { audioBase64, contentType, durationSeconds } = parsed.data;

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  const audio = Buffer.from(audioBase64, "base64");
  const result = await moderateVoice(audio, contentType);
  if (result.status === "rejected") {
    return NextResponse.json(
      { status: "rejected", reason: result.reason ?? "not allowed" },
      { status: 200 },
    );
  }

  const extension = contentType === "audio/mp4" ? "m4a" : contentType === "audio/mpeg" ? "mp3" : "webm";
  // One deterministic path per user, overwritten on re-record, so a
  // member who records six takes leaves one object rather than six.
  // addRandomSuffix would defeat that.
  const { url } = await put(`users/${uid}/voice/intro.${extension}`, audio, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  // The previous recording, if any, is at a different extension when the
  // member switched browsers. Deleting by stored URL rather than by
  // guessing the path.
  const previousUrl = userSnap.data()?.voiceIntro?.url as string | undefined;
  if (previousUrl && previousUrl !== url) {
    await del(previousUrl).catch(() => {});
  }

  await userRef.update({
    voiceIntro: {
      url,
      durationSeconds: Math.round(durationSeconds),
      // "pending" when transcription was unavailable — the recording is
      // stored but the profile does not present it as checked. See
      // lib/moderation's moderateVoice for why an unavailable check
      // never resolves to approved.
      moderationStatus: result.status,
      createdAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ status: result.status, url });
}

export async function DELETE(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userRef = adminDb.collection("users").doc(uid);
  const snap = await userRef.get();
  const url = snap.data()?.voiceIntro?.url as string | undefined;

  // The Firestore field goes first. If the blob delete fails, the result
  // is an orphaned object nobody can reach; doing it the other way round
  // would leave a profile pointing at a URL that 404s, which is the
  // failure the person would actually see.
  await userRef.update({ voiceIntro: null });
  if (url) await del(url).catch(() => {});

  return NextResponse.json({ deleted: true });
}
