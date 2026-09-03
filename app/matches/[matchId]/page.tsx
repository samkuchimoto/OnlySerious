"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import type { Match, Message, UserProfile } from "@/lib/types";

export default function MatchChat() {
  const { matchId } = useParams<{ matchId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<Match | null>(null);
  const [other, setOther] = useState<UserProfile | null>(null);
  const [notAllowed, setNotAllowed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      const matchSnap = await getDoc(doc(db, "matches", matchId));
      if (!matchSnap.exists() || !(matchSnap.data() as Match).userIds.includes(nextUser.uid)) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }
      const matchData = matchSnap.data() as Match;
      setMatch(matchData);
      const otherId = matchData.userIds.find((id) => id !== nextUser.uid);
      if (otherId) {
        const otherSnap = await getDoc(doc(db, "users", otherId));
        if (otherSnap.exists()) setOther(otherSnap.data() as UserProfile);
      }
      setLoading(false);
    });
  }, [matchId]);

  useEffect(() => {
    if (!match) return;
    const q = query(collection(db, "messages"), where("matchId", "==", matchId), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((d) => d.data() as Message));
      },
      (err) => {
        // A query combining an equality filter with orderBy on a
        // different field needs a composite index (see
        // firestore.indexes.json) — without an error handler here, a
        // missing/not-yet-propagated index fails this listener silently
        // and the conversation just never appears, for either side.
        console.error("messages listener failed:", err);
        setError("Couldn't load this conversation. Try refreshing.");
      },
    );
  }, [match, matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!user || !draft.trim()) return;
    setError(null);
    setSending(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ matchId, text: draft.trim() }),
      });
      if (!res.ok) {
        setError("Message couldn't be sent. Please try again.");
        return;
      }
      setDraft("");
    } catch {
      setError("Message couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-4 px-6 py-6">
        <Link href="/matches" className="text-sm text-neutral-400 transition-colors hover:text-neutral-900">
          ← {BRAND_CONFIG.appTitle}
        </Link>
        {other && <p className="text-sm font-medium">{other.displayName}</p>}
      </header>

      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-6">
        {loading && <p className="text-sm text-neutral-400">Loading…</p>}
        {!loading && !user && (
          <Link href="/sign-up" className="text-sm underline underline-offset-2">
            Sign in to view this conversation
          </Link>
        )}
        {!loading && notAllowed && <p className="text-sm text-neutral-500">This conversation isn&apos;t available.</p>}

        {!loading && match && (
          <>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
              {messages.length === 0 && (
                <p className="text-sm text-neutral-400">
                  You matched — say something about {other?.displayName ?? "their"} profile to start.
                </p>
              )}
              {messages.map((message) => {
                const isMine = message.senderId === user?.uid;
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMine ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <form onSubmit={handleSend} className="flex gap-2 border-t border-neutral-100 pt-4">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message…"
                className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
