import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";

// Best-effort push notification — a stale token (uninstalled app,
// revoked permission) or a missing token list just means nothing is
// sent, never an error that should fail the like/message/match that
// triggered it. Removes any token Firebase reports as no-longer-valid
// so the list doesn't grow stale forever.
export async function notifyUser(uid: string, title: string, body: string): Promise<void> {
  try {
    const userRef = adminDb.collection("users").doc(uid);
    const snap = await userRef.get();
    const tokens: string[] = snap.data()?.fcmTokens ?? [];
    if (tokens.length === 0) return;

    const response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
    });

    const deadTokens = response.responses
      .map((r, i) => (r.success ? null : tokens[i]))
      .filter((t): t is string => t !== null);
    if (deadTokens.length > 0) {
      await userRef.update({
        fcmTokens: tokens.filter((t) => !deadTokens.includes(t)),
      });
    }
  } catch (err) {
    console.error(`notifyUser: failed for ${uid}`, err);
  }
}
