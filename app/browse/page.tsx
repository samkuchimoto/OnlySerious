"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import type { UserProfile } from "@/lib/types";

function calculateAge(birthdate: string): number {
  const dob = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

type LikeStatus = "idle" | "sending" | "liked" | "matched" | "limit-reached" | "error";

export default function Browse() {
  const [user, setUser] = useState<User | null>(null);
  const [ownProfile, setOwnProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [likeStatus, setLikeStatus] = useState<Record<string, LikeStatus>>({});
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setLoading(false);
        return;
      }

      const ownSnap = await getDoc(doc(db, "users", nextUser.uid));
      const own = ownSnap.exists() ? (ownSnap.data() as UserProfile) : null;
      setOwnProfile(own);

      const activeSnap = await getDocs(query(collection(db, "users"), where("status", "==", "active")));
      const active = activeSnap.docs
        .map((d) => d.data() as UserProfile)
        .filter((p) => p.id !== nextUser.uid)
        .filter((p) => !own?.interestedIn?.length || own.interestedIn.includes(p.gender));

      setProfiles(active);
      setLoading(false);
    });
  }, []);

  async function handleLike(likedUserId: string) {
    if (!user) return;
    setLikeStatus((prev) => ({ ...prev, [likedUserId]: "sending" }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ likedUserId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setLikeStatus((prev) => ({ ...prev, [likedUserId]: "limit-reached" }));
        setRemaining(0);
        return;
      }
      if (!res.ok) {
        setLikeStatus((prev) => ({ ...prev, [likedUserId]: "error" }));
        return;
      }
      setLikeStatus((prev) => ({ ...prev, [likedUserId]: body.matched ? "matched" : "liked" }));
      setRemaining(typeof body.remaining === "number" ? body.remaining : null);
    } catch {
      setLikeStatus((prev) => ({ ...prev, [likedUserId]: "error" }));
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        <div className="flex items-center gap-5">
          {remaining !== null && (
            <span className="text-sm text-neutral-400">{remaining} likes left today</span>
          )}
          <Link href="/sign-up" className="text-sm text-neutral-400 transition-colors hover:text-neutral-900">
            My profile
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20 sm:px-10">
        {loading && <p className="text-sm text-neutral-400">Loading…</p>}

        {!loading && !user && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Sign in to browse</h1>
            <Link
              href="/sign-up"
              className="rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            >
              Get started
            </Link>
          </div>
        )}

        {!loading && user && !ownProfile && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Finish your profile first</h1>
            <Link
              href="/sign-up"
              className="rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            >
              Create your profile
            </Link>
          </div>
        )}

        {!loading && user && ownProfile && (
          <>
            <h1 className="pt-8 text-3xl font-medium tracking-tight">Browse</h1>
            {profiles.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">
                No one matching your preferences has an active profile yet — check back soon.
              </p>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {profiles.map((profile) => {
                  const status = likeStatus[profile.id] ?? "idle";
                  const photo = profile.photos[0];
                  return (
                    <div key={profile.id} className="flex flex-col gap-2">
                      <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-neutral-100">
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-medium">
                          {profile.displayName}, {calculateAge(profile.birthdate)}
                        </p>
                      </div>
                      <p className="text-xs text-neutral-400">{profile.city}</p>
                      <button
                        onClick={() => handleLike(profile.id)}
                        disabled={status === "sending" || status === "liked" || status === "matched" || status === "limit-reached"}
                        className={`mt-1 rounded-full border px-4 py-2 text-xs font-medium transition-colors disabled:cursor-default ${
                          status === "matched"
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : status === "liked"
                              ? "border-neutral-300 text-neutral-400"
                              : status === "limit-reached"
                                ? "border-neutral-200 text-neutral-300"
                                : "border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white"
                        }`}
                      >
                        {status === "matched"
                          ? "It's a match!"
                          : status === "liked"
                            ? "Liked"
                            : status === "limit-reached"
                              ? "Daily limit reached"
                              : status === "error"
                                ? "Try again"
                                : status === "sending"
                                  ? "…"
                                  : "Like"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
