"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { AppNav } from "@/components/AppNav";
import { withRetry } from "@/lib/retry";
import type { Match, UserProfile } from "@/lib/types";

interface MatchWithOther {
  match: Match;
  other: UserProfile;
}

export default function Matches() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchWithOther[]>([]);
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
          // Blocks in both directions, as Browse does. A block never
          // deletes the match document, so without this the person you
          // blocked stayed in your Matches list with an open conversation
          // — the most visible place they could possibly remain.
          const [matchSnap, blockedByMe, blockedMe] = await Promise.all([
            getDocs(query(collection(db, "matches"), where("userIds", "array-contains", nextUser.uid))),
            getDocs(query(collection(db, "blocks"), where("blockerId", "==", nextUser.uid))),
            getDocs(query(collection(db, "blocks"), where("blockedId", "==", nextUser.uid))),
          ]);
          const blockedIds = new Set([
            ...blockedByMe.docs.map((d) => d.data().blockedId as string),
            ...blockedMe.docs.map((d) => d.data().blockerId as string),
          ]);

          const withOthers = await Promise.all(
            matchSnap.docs.map(async (d) => {
              const match = d.data() as Match;
              const otherId = match.userIds.find((id) => id !== nextUser.uid);
              if (!otherId || blockedIds.has(otherId)) return null;
              const otherSnap = await getDoc(doc(db, "users", otherId));
              if (!otherSnap.exists()) return null;
              return { match, other: otherSnap.data() as UserProfile };
            }),
          );
          setMatches(withOthers.filter((m): m is MatchWithOther => m !== null));
        });
      } catch (err) {
        // Otherwise a failed read here shows "No matches yet" instead of
        // an actual error — indistinguishable from genuinely having none.
        console.error("matches load failed:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <AppNav />

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        <h1 className="pt-8 text-3xl font-medium tracking-tight">Matches</h1>

        {loading && <p className="mt-4 text-sm text-neutral-400">Loading…</p>}

        {!loading && !user && (
          <Link href="/sign-up" className="mt-4 block text-sm underline underline-offset-2">
            Sign in to see your matches
          </Link>
        )}

        {!loading && user && loadError && (
          <p className="mt-4 text-sm text-red-600">
            Couldn&apos;t load your matches.{" "}
            <button onClick={() => window.location.reload()} className="underline underline-offset-2">
              Retry
            </button>
          </p>
        )}

        {!loading && user && !loadError && matches.length === 0 && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
              <Image src="/images/hero-couple-rooftop.png" alt="" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/10" />
            </div>
            <p className="text-sm text-neutral-500">
              No matches yet — a mutual like turns into a match automatically.
            </p>
          </div>
        )}

        {!loading && matches.length > 0 && (
          <div className="mt-8 flex flex-col gap-1">
            {matches.map(({ match, other }) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-neutral-50"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                  {other.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={other.photos[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="text-sm font-medium">{other.displayName}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
