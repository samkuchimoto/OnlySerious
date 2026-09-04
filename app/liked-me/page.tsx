"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { AppNav } from "@/components/AppNav";
import { withRetry } from "@/lib/retry";
import type { Like, UserProfile } from "@/lib/types";

interface LikeWithLiker {
  like: Like;
  liker: UserProfile;
}

type BackStatus = "idle" | "sending" | "matched" | "error";

export default function LikedMe() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<LikeWithLiker[]>([]);
  const [backStatus, setBackStatus] = useState<Record<string, BackStatus>>({});
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      setLoadError(false);
      try {
        await withRetry(async () => {
          const likeSnap = await getDocs(query(collection(db, "likes"), where("likedId", "==", nextUser.uid)));
          const withLikers = await Promise.all(
            likeSnap.docs.map(async (d) => {
              const like = d.data() as Like;
              const likerSnap = await getDoc(doc(db, "users", like.likerId));
              if (!likerSnap.exists()) return null;
              return { like, liker: likerSnap.data() as UserProfile };
            }),
          );
          setLikes(withLikers.filter((l): l is LikeWithLiker => l !== null));
        });
      } catch (err) {
        console.error("liked-me load failed:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    });
  }, []);

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
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <AppNav />

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        <h1 className="pt-8 text-3xl font-medium tracking-tight">Likes</h1>

        {loading && <p className="mt-4 text-sm text-neutral-400">Loading…</p>}
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

        {!loading && user && !loadError && likes.length === 0 && (
          <p className="mt-4 text-sm text-neutral-500">No likes yet — check back soon.</p>
        )}

        {!loading && likes.length > 0 && (
          <div className="mt-8 flex flex-col gap-6">
            {likes.map(({ like, liker }) => {
              const status = backStatus[liker.id] ?? "idle";
              return (
                <div key={like.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5">
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${liker.id}`} className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                      {liker.photos[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={liker.photos[0].url} alt="" className="h-full w-full object-cover" />
                      )}
                    </Link>
                    <div className="flex flex-col">
                      <Link href={`/profile/${liker.id}`} className="text-sm font-medium">
                        {liker.displayName}
                      </Link>
                      {liker.headline && <span className="text-xs text-neutral-500">{liker.headline}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => likeBack(liker.id)}
                    disabled={status === "sending" || status === "matched"}
                    className={`w-fit rounded-full border px-5 py-2 text-sm font-medium transition-colors disabled:cursor-default ${
                      status === "matched"
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white"
                    }`}
                  >
                    {status === "matched" ? "It's a match!" : status === "sending" ? "…" : "Like back"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
