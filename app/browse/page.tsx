"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { UserProfile } from "@/lib/types";

// Decorative only — reflects who the viewer said they're interested in,
// never tied to any real or fake profile. "Other"/unset falls back to
// no banner rather than guessing.
function heroImageFor(interestedIn: string[] | undefined): string | null {
  if (!interestedIn?.length) return null;
  if (interestedIn.includes("woman")) return "/images/hero-woman.png";
  if (interestedIn.includes("man")) return "/images/hero-man.png";
  return null;
}

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
  const [comments, setComments] = useState<Record<string, string>>({});
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

      // Both directions: people I've blocked, and people who've blocked
      // me — neither should see the other in browse.
      const [blockedByMe, blockedMe] = await Promise.all([
        getDocs(query(collection(db, "blocks"), where("blockerId", "==", nextUser.uid))),
        getDocs(query(collection(db, "blocks"), where("blockedId", "==", nextUser.uid))),
      ]);
      const excludedIds = new Set([
        ...blockedByMe.docs.map((d) => d.data().blockedId as string),
        ...blockedMe.docs.map((d) => d.data().blockerId as string),
      ]);

      const activeSnap = await getDocs(query(collection(db, "users"), where("status", "==", "active")));
      const active = activeSnap.docs
        .map((d) => d.data() as UserProfile)
        .filter((p) => p.id !== nextUser.uid)
        .filter((p) => !p.paused)
        .filter((p) => !excludedIds.has(p.id))
        .filter((p) => !own?.interestedIn?.length || own.interestedIn.includes(p.gender));

      setProfiles(active);
      setLoading(false);
    });
  }, []);

  // Contextual like — tied to the featured prompt shown, with an
  // optional reply, so a match starts with an actual conversation
  // opener instead of a blind heart-tap (Hinge's real mechanic, per
  // your request to combine that with ThaiFriendly's browse model).
  async function handleLike(profile: UserProfile) {
    if (!user) return;
    const featuredPrompt = profile.prompts?.[0];
    setLikeStatus((prev) => ({ ...prev, [profile.id]: "sending" }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          likedUserId: profile.id,
          promptId: featuredPrompt?.id,
          comment: comments[profile.id]?.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setLikeStatus((prev) => ({ ...prev, [profile.id]: "limit-reached" }));
        setRemaining(0);
        return;
      }
      if (!res.ok) {
        setLikeStatus((prev) => ({ ...prev, [profile.id]: "error" }));
        return;
      }
      setLikeStatus((prev) => ({ ...prev, [profile.id]: body.matched ? "matched" : "liked" }));
      setRemaining(typeof body.remaining === "number" ? body.remaining : null);
    } catch {
      setLikeStatus((prev) => ({ ...prev, [profile.id]: "error" }));
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        <div className="flex items-center gap-5 text-sm text-neutral-400">
          {remaining !== null && <span>{remaining} likes left today</span>}
          <Link href="/matches" className="transition-colors hover:text-neutral-900">
            Matches
          </Link>
          <Link href="/liked-me" className="transition-colors hover:text-neutral-900">
            Likes
          </Link>
          <Link href="/sign-up" className="transition-colors hover:text-neutral-900">
            My profile
          </Link>
          <Link href="/settings" className="transition-colors hover:text-neutral-900">
            Settings
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
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
            {heroImageFor(ownProfile.interestedIn) && (
              <div className="relative mt-8 aspect-[16/7] w-full overflow-hidden rounded-2xl">
                <Image src={heroImageFor(ownProfile.interestedIn) as string} alt="" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <p className="absolute bottom-4 left-5 text-lg font-medium text-white">Someone serious is out there.</p>
              </div>
            )}
            <h1 className="pt-8 text-3xl font-medium tracking-tight">Browse</h1>
            {profiles.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">
                No one matching your preferences has an active profile yet — check back soon.
              </p>
            ) : (
              <div className="mt-8 flex flex-col gap-10">
                {profiles.map((profile) => {
                  const status = likeStatus[profile.id] ?? "idle";
                  const photo = profile.photos[0];
                  const featuredPrompt = profile.prompts?.[0];
                  const isDone = status === "liked" || status === "matched" || status === "limit-reached";
                  return (
                    <article key={profile.id} className="flex flex-col gap-3">
                      <Link href={`/profile/${profile.id}`} className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-100">
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="h-full w-full object-cover" />
                        )}
                      </Link>
                      <Link href={`/profile/${profile.id}`} className="flex items-center gap-2 text-lg font-medium">
                        {profile.displayName}, {calculateAge(profile.birthdate)}
                        <span className="text-sm font-normal text-neutral-400">{profile.city}</span>
                        <VerifiedBadge approvedPhotoCount={profile.photos.length} />
                      </Link>

                      {featuredPrompt && (
                        <div className="rounded-xl border border-neutral-200 p-5">
                          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                            {featuredPrompt.question}
                          </p>
                          <p className="mt-1.5 text-base">{featuredPrompt.answer}</p>
                        </div>
                      )}

                      {!isDone && status !== "error" && (
                        <input
                          type="text"
                          placeholder="Add a comment (optional)"
                          value={comments[profile.id] ?? ""}
                          onChange={(e) => setComments((prev) => ({ ...prev, [profile.id]: e.target.value }))}
                          className="rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                        />
                      )}

                      <button
                        onClick={() => handleLike(profile)}
                        disabled={status === "sending" || isDone}
                        className={`w-fit rounded-full border px-6 py-2.5 text-sm font-medium transition-colors disabled:cursor-default ${
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
                    </article>
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
