"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getActivityStatus, isNewMember } from "@/lib/activity";
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

      // Real "last active" signal, not a live presence system — see
      // lib/activity.ts. Fire-and-forget: this page's own render doesn't
      // depend on it succeeding.
      if (own) updateDoc(doc(db, "users", nextUser.uid), { lastActiveAt: new Date().toISOString() }).catch(() => {});

      // Both directions for blocks: people I've blocked, and people who've
      // blocked me — neither should see the other in browse. Hides are
      // one-directional by design (see lib/types.ts's Hide comment) — only
      // the hider's own results are filtered. Already-liked profiles are
      // excluded too, so a reload doesn't re-show someone as freshly
      // likeable (see app/api/likes' deterministic-id fix for the data
      // side of the same bug).
      const [blockedByMe, blockedMe, hiddenByMe, likedByMe] = await Promise.all([
        getDocs(query(collection(db, "blocks"), where("blockerId", "==", nextUser.uid))),
        getDocs(query(collection(db, "blocks"), where("blockedId", "==", nextUser.uid))),
        getDocs(query(collection(db, "hides"), where("hiderId", "==", nextUser.uid))),
        getDocs(query(collection(db, "likes"), where("likerId", "==", nextUser.uid))),
      ]);
      const excludedIds = new Set([
        ...blockedByMe.docs.map((d) => d.data().blockedId as string),
        ...blockedMe.docs.map((d) => d.data().blockerId as string),
        ...hiddenByMe.docs.map((d) => d.data().hiddenId as string),
        ...likedByMe.docs.map((d) => d.data().likedId as string),
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

  // Plain like — no per-prompt targeting or comment (ThaiFriendly's
  // model, per direct feedback: simpler than Hinge's "like a specific
  // card + optional reply" mechanic).
  async function handleLike(profile: UserProfile) {
    if (!user) return;
    setLikeStatus((prev) => ({ ...prev, [profile.id]: "sending" }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ likedUserId: profile.id }),
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

  // One-tap, no confirmation — a deliberately lighter alternative to
  // Block (see lib/types.ts's Hide comment) available right from the
  // grid, not just the profile-detail menu.
  async function handleHide(profileId: string) {
    if (!user) return;
    await setDoc(doc(db, "hides", `${user.uid}_${profileId}`), {
      id: `${user.uid}_${profileId}`,
      hiderId: user.uid,
      hiddenId: profileId,
      createdAt: new Date().toISOString(),
    });
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
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
                  const isDone = status === "liked" || status === "matched" || status === "limit-reached";
                  const activity = getActivityStatus(profile.lastActiveAt);
                  const isNew = isNewMember(profile.createdAt);
                  return (
                    <article key={profile.id} className="flex flex-col gap-3">
                      <Link
                        href={`/profile/${profile.id}`}
                        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-100"
                      >
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="h-full w-full object-cover" />
                        )}
                        {isNew && (
                          <span className="absolute bottom-3 right-3 rounded-md bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                            NEW
                          </span>
                        )}
                      </Link>
                      <Link href={`/profile/${profile.id}`} className="flex flex-wrap items-center gap-2 text-lg font-medium">
                        {activity?.isOnline && <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden />}
                        {profile.displayName}, {calculateAge(profile.birthdate)}
                        <span className="text-sm font-normal text-neutral-400">{profile.city}</span>
                        <VerifiedBadge approvedPhotoCount={profile.photos.length} selfieVerified={profile.selfieVerified} />
                      </Link>
                      {activity && !activity.isOnline && <p className="-mt-2 text-xs text-neutral-400">{activity.label}</p>}

                      {profile.headline && <p className="text-base font-medium">{profile.headline}</p>}
                      {profile.bio && <p className="text-sm text-neutral-600">{profile.bio}</p>}

                      <div className="flex items-center gap-4">
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
                        {!isDone && (
                          <button
                            onClick={() => handleHide(profile.id)}
                            className="text-sm text-neutral-400 transition-colors hover:text-neutral-700"
                          >
                            Not interested
                          </button>
                        )}
                      </div>
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
