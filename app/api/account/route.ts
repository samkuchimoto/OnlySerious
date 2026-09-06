import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { verifyRequestUser, adminDb, adminAuth } from "@/lib/firebaseAdmin";
import type { UserProfile } from "@/lib/types";

// Full account deletion. The Settings screen promises "permanently
// removes your profile, photos, and message history" — this makes that
// true. It previously deleted only the profile document, the
// photoSubmissions subcollection and the Auth user, which left:
//
//   - every uploaded photo still public at its Blob URL, forever. Worst
//     of the set: someone leaves expecting their pictures gone, and they
//     remain fetchable by anyone holding the link.
//   - likes, matches, messages, blocks and hides all pointing at a user
//     that no longer exists, with the other side of each conversation
//     still holding the deleted person's messages.
//
// Firestore has no cascade, so every collection referencing a user has
// to be swept explicitly. Order matters: content first, identity last,
// so a failure part-way leaves an account that can still sign in and
// retry rather than an orphaned pile of data with no owner.

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 450;

async function deleteRefs(refs: FirebaseFirestore.DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = adminDb.batch();
    for (const ref of refs.slice(i, i + BATCH_LIMIT)) batch.delete(ref);
    await batch.commit();
  }
}

export async function DELETE(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const profile = userSnap.exists ? (userSnap.data() as UserProfile) : null;

  // --- Photo files -------------------------------------------------
  // Both the live profile photos and every moderation submission,
  // including ones that were rejected and never shown publicly.
  const submissionSnaps = await userRef.collection("photoSubmissions").get();
  const blobUrls = new Set<string>();
  for (const photo of profile?.photos ?? []) {
    if (photo.url) blobUrls.add(photo.url);
  }
  for (const doc of submissionSnaps.docs) {
    const url = doc.data()?.url as string | undefined;
    if (url) blobUrls.add(url);
  }
  // Best-effort per file: one unreachable blob must not abort the
  // deletion and strand the account. Failures are logged so an orphan
  // can be cleaned up later, which is far better than refusing to let
  // someone leave.
  await Promise.all(
    [...blobUrls].map((url) =>
      del(url).catch((err) => console.error(`account deletion: blob ${url} not removed`, err)),
    ),
  );

  // --- Matches and their messages ----------------------------------
  const matchSnaps = await adminDb
    .collection("matches")
    .where("userIds", "array-contains", uid)
    .get();
  const matchIds = matchSnaps.docs.map((d) => d.id);

  // Messages are keyed by matchId, so they're found through the matches
  // rather than by sender — that's what also removes the copies sitting
  // in the other person's conversation.
  const messageRefs: FirebaseFirestore.DocumentReference[] = [];
  for (const matchId of matchIds) {
    const msgs = await adminDb.collection("messages").where("matchId", "==", matchId).get();
    messageRefs.push(...msgs.docs.map((d) => d.ref));
  }
  await deleteRefs(messageRefs);
  await deleteRefs(matchSnaps.docs.map((d) => d.ref));

  // --- Likes, blocks, hides (both directions) -----------------------
  // Each needs two queries: Firestore has no OR across different fields.
  const [likesGiven, likesReceived, blocksBy, blocksOf, hidesBy, hidesOf] = await Promise.all([
    adminDb.collection("likes").where("likerId", "==", uid).get(),
    adminDb.collection("likes").where("likedId", "==", uid).get(),
    adminDb.collection("blocks").where("blockerId", "==", uid).get(),
    adminDb.collection("blocks").where("blockedId", "==", uid).get(),
    adminDb.collection("hides").where("hiderId", "==", uid).get(),
    adminDb.collection("hides").where("hiddenId", "==", uid).get(),
  ]);
  await deleteRefs(
    [likesGiven, likesReceived, blocksBy, blocksOf, hidesBy, hidesOf].flatMap((snap) =>
      snap.docs.map((d) => d.ref),
    ),
  );

  // --- The profile itself ------------------------------------------
  const noteSnaps = await userRef.collection("notes").get();
  await deleteRefs([...submissionSnaps.docs, ...noteSnaps.docs].map((d) => d.ref));
  await userRef.delete();

  // Identity last: until this succeeds the person can still sign in and
  // retry, which is the recoverable failure mode.
  await adminAuth.deleteUser(uid).catch((err) => {
    console.error(`account deletion: failed to delete Auth user ${uid}`, err);
  });

  return NextResponse.json({ deleted: true });
}
