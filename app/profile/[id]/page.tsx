"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PrivateNote } from "@/components/PrivateNote";
import { getActivityStatus } from "@/lib/activity";
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

const REPORT_REASONS = ["Fake profile", "Inappropriate photos", "Solicitation", "Harassment", "Other"];

type LikeStatus = "idle" | "sending" | "liked" | "matched" | "limit-reached" | "error";

export default function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [likeStatus, setLikeStatus] = useState<LikeStatus>("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      const snap = await getDoc(doc(db, "users", id));
      if (snap.exists()) setProfile(snap.data() as UserProfile);
      setLoading(false);
    });
  }, [id]);

  async function handleLike() {
    if (!user || !profile) return;
    setLikeStatus("sending");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ likedUserId: profile.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setLikeStatus("limit-reached");
        return;
      }
      if (!res.ok) {
        setLikeStatus("error");
        return;
      }
      setLikeStatus(body.matched ? "matched" : "liked");
    } catch {
      setLikeStatus("error");
    }
  }

  async function handleBlock() {
    if (!user || !profile) return;
    setMenuOpen(false);
    await setDoc(doc(db, "blocks", `${user.uid}_${profile.id}`), {
      id: `${user.uid}_${profile.id}`,
      blockerId: user.uid,
      blockedId: profile.id,
      createdAt: new Date().toISOString(),
    });
    router.push("/browse");
  }

  // Deliberately no confirmation step and no report-style reason picker —
  // the entire point is a one-tap, low-friction "don't show me this
  // person again" that's lighter than Block, so it doesn't add the same
  // friction it's meant to be an alternative to.
  async function handleHide() {
    if (!user || !profile) return;
    setMenuOpen(false);
    await setDoc(doc(db, "hides", `${user.uid}_${profile.id}`), {
      id: `${user.uid}_${profile.id}`,
      hiderId: user.uid,
      hiddenId: profile.id,
      createdAt: new Date().toISOString(),
    });
    router.push("/browse");
  }

  async function handleReport(reason: string) {
    if (!user || !profile) return;
    const reportId = crypto.randomUUID();
    await setDoc(doc(db, "reports", reportId), {
      id: reportId,
      reportedUserId: profile.id,
      reportedByUserId: user.uid,
      reason,
      context: "",
      createdAt: new Date().toISOString(),
      status: "open",
    });
    setReportOpen(false);
    setActionMessage("Report submitted — thank you.");
  }

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-8">
        <Link href="/browse" className="text-sm text-neutral-400 transition-colors hover:text-neutral-900">
          ← {BRAND_CONFIG.appTitle}
        </Link>
        {user && profile && user.uid !== profile.id && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full px-2 py-1 text-lg text-neutral-400 hover:text-neutral-900"
              aria-label="More options"
            >
              •••
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                <button onClick={handleHide} className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-50">
                  Not interested
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  Report
                </button>
                <button onClick={handleBlock} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-neutral-50">
                  Block
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        {loading && <p className="text-sm text-neutral-400">Loading…</p>}
        {!loading && !profile && <p className="text-sm text-neutral-500">This profile isn&apos;t available.</p>}

        {actionMessage && <p className="mb-4 text-sm text-neutral-600">{actionMessage}</p>}

        {reportOpen && (
          <div className="mb-6 flex flex-col gap-2 rounded-xl border border-neutral-200 p-5">
            <p className="text-sm font-medium">Why are you reporting this profile?</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReport(reason)}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm transition-colors hover:border-neutral-900"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button onClick={() => setReportOpen(false)} className="mt-1 w-fit text-xs text-neutral-400 underline">
              Cancel
            </button>
          </div>
        )}

        {!loading && profile && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-medium tracking-tight">
                  {profile.displayName}, {calculateAge(profile.birthdate)}
                </h1>
                <VerifiedBadge approvedPhotoCount={profile.photos.length} selfieVerified={profile.selfieVerified} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-neutral-400">
                  {profile.city}
                  {profile.country ? `, ${profile.country}` : ""}
                </span>
                {(() => {
                  const activity = getActivityStatus(profile.lastActiveAt);
                  if (!activity) return null;
                  return (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        activity.isOnline ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {activity.isOnline && <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />}
                      {activity.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {user && profile.id !== user.uid && <PrivateNote user={user} aboutUserId={profile.id} />}

            {(profile.headline || profile.bio) && (
              <div className="flex flex-col gap-1.5">
                {profile.headline && <p className="text-lg font-medium">{profile.headline}</p>}
                {profile.bio && <p className="text-sm text-neutral-600">{profile.bio}</p>}
              </div>
            )}

            {profile.photos.map((photo) => (
              <div key={photo.id} className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}

            {user && user.uid !== profile.id && (
              <button
                onClick={handleLike}
                disabled={likeStatus === "sending" || likeStatus === "liked" || likeStatus === "matched" || likeStatus === "limit-reached"}
                className={`w-fit rounded-full border px-8 py-3.5 text-sm font-medium transition-colors disabled:cursor-default ${
                  likeStatus === "matched"
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : likeStatus === "liked"
                      ? "border-neutral-300 text-neutral-400"
                      : likeStatus === "limit-reached"
                        ? "border-neutral-200 text-neutral-300"
                        : "border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                {likeStatus === "matched"
                  ? "It's a match!"
                  : likeStatus === "liked"
                    ? "Liked"
                    : likeStatus === "limit-reached"
                      ? "Daily limit reached"
                      : likeStatus === "error"
                        ? "Try again"
                        : likeStatus === "sending"
                          ? "…"
                          : "Like"}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
