import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import { verifySelfie } from "@/lib/moderation";
import type { UserProfile } from "@/lib/types";

const requestSchema = z.object({
  selfieBase64: z.string().min(100).max(5_500_000),
});

// The only place selfieVerified is ever set — always to a real Groq
// vision comparison result, never client-asserted (selfieVerified is in
// firestore.rules' locked-fields list).
export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }
  const profile = userSnap.data() as UserProfile;
  const approvedPhoto = profile.photos[0];
  if (!approvedPhoto) {
    return NextResponse.json({ error: "add at least one approved photo first" }, { status: 400 });
  }

  const result = await verifySelfie(parsed.data.selfieBase64, approvedPhoto.url);
  if (result.verified) {
    await userRef.update({ selfieVerified: true });
  }

  return NextResponse.json(result);
}
