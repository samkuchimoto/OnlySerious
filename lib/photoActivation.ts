import { adminDb } from "@/lib/firebaseAdmin";
import { MIN_PROFILE_PHOTOS, type ProfilePhoto } from "@/lib/types";

// Appends an approved photo to the public profile doc and auto-activates
// once the minimum is met — shared by the initial upload route
// (app/api/photos/route.ts) and the retry route
// (app/api/photos/retry/route.ts), since a retry that succeeds needs the
// exact same effect a first-try approval would have had.
export async function publishApprovedPhoto(uid: string, photo: ProfilePhoto): Promise<void> {
  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const existingPhotos: ProfilePhoto[] = userSnap.data()?.photos ?? [];
  if (existingPhotos.some((p) => p.id === photo.id)) return;

  const updatedPhotos = [...existingPhotos, photo];
  const update: Record<string, unknown> = { photos: updatedPhotos };
  // Never touches a profile a human has already suspended.
  if (updatedPhotos.length >= MIN_PROFILE_PHOTOS && userSnap.data()?.status === "pending_review") {
    update.status = "active";
  }
  await userRef.update(update);
}
