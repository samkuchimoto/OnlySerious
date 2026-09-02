"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import type { Match, UserProfile } from "@/lib/types";

interface MatchWithOther {
  match: Match;
  other: UserProfile;
}

export default function Matches() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchWithOther[]>([]);

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      const matchSnap = await getDocs(query(collection(db, "matches"), where("userIds", "array-contains", nextUser.uid)));
      const withOthers = await Promise.all(
        matchSnap.docs.map(async (d) => {
          const match = d.data() as Match;
          const otherId = match.userIds.find((id) => id !== nextUser.uid);
          if (!otherId) return null;
          const otherSnap = await getDoc(doc(db, "users", otherId));
          if (!otherSnap.exists()) return null;
          return { match, other: otherSnap.data() as UserProfile };
        }),
      );
      setMatches(withOthers.filter((m): m is MatchWithOther => m !== null));
      setLoading(false);
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        <div className="flex items-center gap-5 text-sm text-neutral-400">
          <Link href="/browse" className="transition-colors hover:text-neutral-900">
            Browse
          </Link>
          <Link href="/liked-me" className="transition-colors hover:text-neutral-900">
            Likes
          </Link>
          <Link href="/settings" className="transition-colors hover:text-neutral-900">
            Settings
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        <h1 className="pt-8 text-3xl font-medium tracking-tight">Matches</h1>

        {loading && <p className="mt-4 text-sm text-neutral-400">Loading…</p>}

        {!loading && !user && (
          <Link href="/sign-up" className="mt-4 block text-sm underline underline-offset-2">
            Sign in to see your matches
          </Link>
        )}

        {!loading && user && matches.length === 0 && (
          <p className="mt-4 text-sm text-neutral-500">
            No matches yet — a mutual like turns into a match automatically.
          </p>
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
