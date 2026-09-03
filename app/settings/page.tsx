"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, signOutUser, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import { SelfieVerification } from "@/components/SelfieVerification";
import { NotificationSettings } from "@/components/NotificationSettings";
import { BlockedHiddenList } from "@/components/BlockedHiddenList";
import type { UserProfile } from "@/lib/types";

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pausing, setPausing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", nextUser.uid));
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      } catch (err) {
        console.error("settings load failed:", err);
        setError("Couldn't load your settings. Try refreshing the page.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function togglePause() {
    if (!user || !profile) return;
    setPausing(true);
    try {
      const next = !profile.paused;
      await updateDoc(doc(db, "users", user.uid), { paused: next });
      setProfile({ ...profile, paused: next });
    } finally {
      setPausing(false);
    }
  }

  async function deleteAccount() {
    if (!user) return;
    setDeleting(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        setError("Something went wrong deleting your account. Please try again.");
        setDeleting(false);
        return;
      }
      await signOutUser();
      router.push("/");
    } catch {
      setError("Something went wrong deleting your account. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-8">
        <Link href="/browse" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        <h1 className="pt-8 text-3xl font-medium tracking-tight">Settings</h1>
        {!loading && !profile && error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {loading && <p className="mt-4 text-sm text-neutral-400">Loading…</p>}

        {!loading && !user && (
          <Link href="/sign-up" className="mt-4 block text-sm underline underline-offset-2">
            Sign in
          </Link>
        )}

        {!loading && user && (
          <div className="mt-8 flex flex-col gap-8">
            <div className="flex flex-col gap-3 border-b border-neutral-100 pb-8">
              <h2 className="text-sm font-medium text-neutral-700">Account</h2>
              <button
                onClick={() => signOutUser()}
                className="w-fit text-sm text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
              >
                Sign out
              </button>
            </div>

            {profile && (
              <div className="flex flex-col gap-3 border-b border-neutral-100 pb-8">
                <h2 className="text-sm font-medium text-neutral-700">Profile visibility</h2>
                <p className="text-sm text-neutral-500">
                  {profile.paused
                    ? "Your profile is paused — no one can see it or like you right now."
                    : "Your profile is visible to other members whenever it's active."}
                </p>
                <button
                  onClick={togglePause}
                  disabled={pausing}
                  className="w-fit rounded-full border border-neutral-900 px-5 py-2 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white disabled:opacity-50"
                >
                  {pausing ? "…" : profile.paused ? "Unpause profile" : "Pause profile"}
                </button>
              </div>
            )}

            {user && (
              <div className="flex flex-col gap-3 border-b border-neutral-100 pb-8">
                <h2 className="text-sm font-medium text-neutral-700">Notifications</h2>
                <NotificationSettings user={user} />
              </div>
            )}

            {user && profile && (
              <div className="flex flex-col gap-3 border-b border-neutral-100 pb-8">
                <h2 className="text-sm font-medium text-neutral-700">Verification</h2>
                <SelfieVerification user={user} alreadyVerified={!!profile.selfieVerified} />
              </div>
            )}

            <div className="flex flex-col gap-3 border-b border-neutral-100 pb-8">
              <h2 className="text-sm font-medium text-neutral-700">Legal</h2>
              <div className="flex flex-col gap-1.5 text-sm">
                <Link href="/terms" className="w-fit underline underline-offset-2 text-neutral-600 hover:text-neutral-900">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="w-fit underline underline-offset-2 text-neutral-600 hover:text-neutral-900">
                  Privacy Policy
                </Link>
                <Link href="/community-guidelines" className="w-fit underline underline-offset-2 text-neutral-600 hover:text-neutral-900">
                  Community Guidelines
                </Link>
                <Link href="/safety" className="w-fit underline underline-offset-2 text-neutral-600 hover:text-neutral-900">
                  Dating Safety
                </Link>
              </div>
            </div>

            {user && (
              <div className="flex flex-col gap-3 border-b border-neutral-100 pb-8">
                <h2 className="text-sm font-medium text-neutral-700">Blocked &amp; hidden</h2>
                <BlockedHiddenList user={user} />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-red-600">Delete account</h2>
              <p className="text-sm text-neutral-500">
                Permanently removes your profile, photos, and message history. This can&apos;t be undone.
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {!confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="w-fit rounded-full border border-red-600 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white"
                >
                  Delete my account
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <button
                    onClick={deleteAccount}
                    disabled={deleting}
                    className="w-fit rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Yes, permanently delete"}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="text-sm text-neutral-400 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
