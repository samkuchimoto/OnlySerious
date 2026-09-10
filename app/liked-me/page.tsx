"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { watchAuthState } from "@/lib/firebase";
import { AppNav } from "@/components/AppNav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MascotEmptyState } from "@/components/Mascot";
import { getActivityStatus } from "@/lib/activity";
import { capture } from "@/lib/analytics";

// Reads from app/api/liked-me rather than Firestore directly: who liked
// you is the paid feature, and firestore.rules no longer exposes it to
// the client (see the likes rule for why).
type LikedMeEntry = {
  id: string;
  likerId: string;
  displayName: string;
  headline: string;
  birthdate: string;
  city: string;
  photoUrl: string | null;
  selfieVerified: boolean;
  photoCount: number;
  lastActiveAt: string | null;
  matched: boolean;
};

type BackStatus = "idle" | "sending" | "matched" | "limit-reached" | "error";

function calculateAge(birthdate: string): number {
  const dob = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

export default function LikedMe() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [count, setCount] = useState(0);
  const [likes, setLikes] = useState<LikedMeEntry[]>([]);
  const [backStatus, setBackStatus] = useState<Record<string, BackStatus>>({});
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async (nextUser: User) => {
    setLoadError(false);
    try {
      const idToken = await nextUser.getIdToken();
      // A request that never settles leaves this page on "Loading…"
      // forever, with no error and no retry — the one failure mode a
      // user cannot tell from a slow network or a broken app. Fifteen
      // seconds is well past any healthy response, and aborting turns
      // the hang into the error state that already exists below.
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 15_000);
      const res = await fetch("/api/liked-me", {
        headers: { Authorization: `Bearer ${idToken}` },
        signal: abort.signal,
      }).finally(() => clearTimeout(timeout));
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const body = await res.json();
      setLocked(Boolean(body.locked));
      setCount(body.count ?? 0);
      setLikes(body.likes ?? []);
      setBackStatus(
        Object.fromEntries(
          (body.likes ?? [])
            .filter((l: LikedMeEntry) => l.matched)
            .map((l: LikedMeEntry) => [l.likerId, "matched" as BackStatus]),
        ),
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      await load(nextUser);
    });
  }, [load]);

  async function likeBack(likerId: string) {
    if (!user) return;
    setBackStatus((prev) => ({ ...prev, [likerId]: "sending" }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ likedUserId: likerId }),
      });
      if (res.status === 429) {
        setBackStatus((prev) => ({ ...prev, [likerId]: "limit-reached" }));
        capture("daily_limit_reached", { source: "liked_me" });
        return;
      }
      if (!res.ok) {
        setBackStatus((prev) => ({ ...prev, [likerId]: "error" }));
        return;
      }
      setBackStatus((prev) => ({ ...prev, [likerId]: "matched" }));
    } catch {
      setBackStatus((prev) => ({ ...prev, [likerId]: "error" }));
    }
  }

  return (
    <main className="flex min-h-screen flex-col text-[var(--foreground)]">
      <AppNav />

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        <h1 className="pt-8 text-3xl font-medium tracking-tight">Likes</h1>

        {loading && <p className="mt-4 text-sm text-[var(--muted)]">Loading…</p>}

        {!loading && !user && (
          <Link href="/sign-up" className="mt-4 block text-sm underline underline-offset-2">
            Sign in to see who liked you
          </Link>
        )}

        {!loading && user && loadError && (
          <p className="mt-4 text-sm text-red-600">
            Couldn&apos;t load your likes.{" "}
            <button onClick={() => window.location.reload()} className="underline underline-offset-2">
              Retry
            </button>
          </p>
        )}

        {!loading && user && !loadError && count === 0 && (
          <MascotEmptyState
            pose="sitting"
            title="No likes yet"
            body="When someone likes you, they appear here. Profiles with more photos and a filled-in headline get seen more often."
          />
        )}

        {/* The paywall. The count is real and matches what unlocking
            actually reveals — a padded number that shrinks after payment
            is how you earn a refund request. No identifying detail is
            sent to the browser at all; the tiles below are placeholders,
            not blurred photos. */}
        {!loading && user && !loadError && locked && count > 0 && (
          <div className="mt-8 flex flex-col gap-6">
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--rule)] bg-[color-mix(in_srgb,var(--gold)_7%,var(--background))] p-6">
              <p className="text-xl font-medium tracking-tight">
                {count === 1 ? "1 person likes you" : `${count} people like you`}
              </p>
              <p className="max-w-md text-sm text-[var(--muted)]">
                They&apos;ve already said yes. Subscribe to see who they are and like them back — a
                match is one tap away.
              </p>
              <Link
                href="/premium"
                onClick={() => capture("upgrade_clicked", { source: "liked_me_paywall" })}
                className="btn-gold px-6 py-2.5 text-sm"
              >
                See who likes you
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3" aria-hidden>
              {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-xl bg-[var(--rule)]"
                >
                  <span className="text-2xl text-[var(--muted)]">?</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && user && !loadError && !locked && likes.length > 0 && (
          <div className="mt-8 flex flex-col gap-6">
            {likes.map((entry) => {
              const status = backStatus[entry.likerId] ?? "idle";
              const activity = getActivityStatus(entry.lastActiveAt ?? undefined);
              return (
                <div key={entry.id} className="flex flex-col gap-3 rounded-xl border border-[var(--rule)] p-5">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/profile/${entry.likerId}`}
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--rule)]"
                    >
                      {entry.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.photoUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </Link>
                    <div className="flex flex-col">
                      <Link
                        href={`/profile/${entry.likerId}`}
                        className="flex flex-wrap items-center gap-1.5 text-sm font-medium"
                      >
                        {entry.displayName}, {calculateAge(entry.birthdate)}
                        <span className="text-xs font-normal text-[var(--muted)]">{entry.city}</span>
                        <VerifiedBadge
                          approvedPhotoCount={entry.photoCount}
                          selfieVerified={entry.selfieVerified}
                        />
                      </Link>
                      {entry.headline && <span className="text-xs text-[var(--muted)]">{entry.headline}</span>}
                      {activity && <span className="text-xs text-[var(--muted)]">{activity.label}</span>}
                    </div>
                  </div>

                  {status === "limit-reached" ? (
                    <div className="flex flex-col items-start gap-1.5">
                      <p className="text-sm text-[var(--muted)]">
                        You&apos;re out of likes for today — and {entry.displayName} already likes you.
                      </p>
                      <Link
                        href="/premium"
                        onClick={() => capture("upgrade_clicked", { source: "liked_me_limit" })}
                        className="w-fit btn-gold px-5 py-2 text-sm"
                      >
                        Match with {entry.displayName} now
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => likeBack(entry.likerId)}
                      disabled={status === "sending" || status === "matched"}
                      className={`w-fit rounded-full border px-5 py-2 text-sm font-medium transition-colors disabled:cursor-default ${
                        status === "matched"
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                          : "border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-white"
                      }`}
                    >
                      {status === "matched"
                        ? "It's a match!"
                        : status === "sending"
                          ? "…"
                          : status === "error"
                            ? "Try again"
                            : "Like back"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
