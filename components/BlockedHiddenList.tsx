"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { withRetry } from "@/lib/retry";
import type { UserProfile } from "@/lib/types";

interface Entry {
  docId: string;
  otherId: string;
  name: string | null;
}

// Two separate lists (not merged) so it's clear which action undoes
// which — blocking and hiding carry different weight (see lib/types.ts's
// Hide comment) and a user reversing one shouldn't be confused for the
// other.
export function BlockedHiddenList({ user }: { user: User }) {
  const [blocked, setBlocked] = useState<Entry[]>([]);
  const [hidden, setHidden] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        await withRetry(async () => {
          const [blockSnap, hideSnap] = await Promise.all([
            getDocs(query(collection(db, "blocks"), where("blockerId", "==", user.uid))),
            getDocs(query(collection(db, "hides"), where("hiderId", "==", user.uid))),
          ]);

          async function withNames(docs: typeof blockSnap.docs, otherIdField: "blockedId" | "hiddenId") {
            return Promise.all(
              docs.map(async (d) => {
                const otherId = d.data()[otherIdField] as string;
                const profileSnap = await getDoc(doc(db, "users", otherId));
                const name = profileSnap.exists() ? (profileSnap.data() as UserProfile).displayName : null;
                return { docId: d.id, otherId, name };
              }),
            );
          }

          const [blockedEntries, hiddenEntries] = await Promise.all([
            withNames(blockSnap.docs, "blockedId"),
            withNames(hideSnap.docs, "hiddenId"),
          ]);
          setBlocked(blockedEntries);
          setHidden(hiddenEntries);
        });
      } catch (err) {
        console.error("blocked/hidden list load failed:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.uid]);

  async function remove(collectionName: "blocks" | "hides", entry: Entry) {
    setRemovingId(entry.docId);
    await deleteDoc(doc(db, collectionName, entry.docId));
    if (collectionName === "blocks") setBlocked((prev) => prev.filter((e) => e.docId !== entry.docId));
    else setHidden((prev) => prev.filter((e) => e.docId !== entry.docId));
    setRemovingId(null);
  }

  if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (loadError) return <p className="text-sm text-red-600">Couldn&apos;t load this list. Try refreshing.</p>;
  if (blocked.length === 0 && hidden.length === 0) {
    return <p className="text-sm text-neutral-500">You haven&apos;t blocked or hidden anyone.</p>;
  }

  function EntryRow({ entry, collectionName }: { entry: Entry; collectionName: "blocks" | "hides" }) {
    return (
      <div className="flex items-center justify-between gap-3">
        {entry.name ? (
          <Link href={`/profile/${entry.otherId}`} className="text-sm text-neutral-700 hover:underline">
            {entry.name}
          </Link>
        ) : (
          <span className="text-sm text-neutral-400">Deleted profile</span>
        )}
        <button
          onClick={() => remove(collectionName, entry)}
          disabled={removingId === entry.docId}
          className="text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-50"
        >
          {collectionName === "blocks" ? "Unblock" : "Unhide"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {blocked.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Blocked ({blocked.length})</p>
          {blocked.map((entry) => (
            <EntryRow key={entry.docId} entry={entry} collectionName="blocks" />
          ))}
        </div>
      )}
      {hidden.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Hidden ({hidden.length})</p>
          {hidden.map((entry) => (
            <EntryRow key={entry.docId} entry={entry} collectionName="hides" />
          ))}
        </div>
      )}
    </div>
  );
}
