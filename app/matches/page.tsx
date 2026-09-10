"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { AppNav } from "@/components/AppNav";
import { EmptyState } from "@/components/EmptyState";
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
              // firestore.rules only exposes a profile to others while it
              // is 'active', so this read is genuinely permission-denied
              // whenever the other side is suspended, pending re-review,
              // or deleted. That is a normal state, not a failure — but
              // it threw, and one unreadable profile took the entire page
              // down with "Couldn't load your matches". Skip that row and
              // keep the rest of the conversation list.
              const otherSnap = await getDoc(doc(db, "users", otherId)).catch(() => null);
              if (!otherSnap?.exists()) return null;
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
    <main className="flex min-h-screen flex-col text-[var(--foreground)]">
      <AppNav />

      <section className="canvas measure flex-1 pb-20">
        <h1 className="pt-8 text-3xl font-medium tracking-tight">Matches</h1>

        {loading && <p className="mt-4 text-sm text-[var(--muted)]">Loading…</p>}

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
          <EmptyState
            title="No matches yet"
            body="A mutual like turns into a match automatically — there is nothing else you need to do here."
          />
        )}

        {!loading && matches.length > 0 && (
          <div className="mt-8 flex flex-col gap-1">
            {matches.map(({ match, other }) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--gold)_7%,var(--background))]"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--rule)]">
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
