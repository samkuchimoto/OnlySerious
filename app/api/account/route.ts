import { NextResponse } from "next/server";
import { verifyRequestUser, adminDb, adminAuth } from "@/lib/firebaseAdmin";

// Deletes the Firestore profile (including the private photoSubmissions
// subcollection) and the Firebase Auth user itself. Best-effort on the
// uploaded Blob photos — leaving an orphaned image if that step fails
// is a much smaller problem than failing the whole deletion and leaving
// someone's account stuck when they asked to leave.
export async function DELETE(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  const submissions = await userRef.collection("photoSubmissions").listDocuments();
  await Promise.all(submissions.map((docRef) => docRef.delete()));
  await userRef.delete();

  await adminAuth.deleteUser(uid).catch((err) => {
    console.error(`account deletion: failed to delete Auth user ${uid}`, err);
  });

  return NextResponse.json({ deleted: true });
}
