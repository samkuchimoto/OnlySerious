"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import { withRetry } from "@/lib/retry";
import { getActivityStatus } from "@/lib/activity";
import { capture } from "@/lib/analytics";
import { FREE_MESSAGE_COOLDOWN_MS, type Match, type Message, type UserProfile } from "@/lib/types";

// mm:ss, because a bare "412 seconds left" is unreadable at a glance.
function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

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
  // Absolute wall-clock time the next message may be sent, not a
  // remaining-seconds number — a counter that only decrements while the
  // tab is focused would drift and let the input unlock early.
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Ticks only while a cooldown is actually running.
  useEffect(() => {
    if (cooldownUntil === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownRemaining = cooldownUntil === null ? 0 : Math.max(0, cooldownUntil - now);
  const onCooldown = cooldownRemaining > 0;

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      try {
        await withRetry(async () => {
          const matchSnap = await getDoc(doc(db, "matches", matchId));
          if (!matchSnap.exists() || !(matchSnap.data() as Match).userIds.includes(nextUser.uid)) {
            setNotAllowed(true);
            return;
          }
          const matchData = matchSnap.data() as Match;
          setMatch(matchData);
          const otherId = matchData.userIds.find((id) => id !== nextUser.uid);
          if (otherId) {
            const otherSnap = await getDoc(doc(db, "users", otherId));
            if (otherSnap.exists()) setOther(otherSnap.data() as UserProfile);
          }

          // Restore any cooldown still running from a previous visit.
          // Without this the countdown would only ever appear after a
          // send in this same session, so reopening the chat would show
          // an enabled Send button that the server then refuses.
          const ownSnap = await getDoc(doc(db, "users", nextUser.uid));
          const own = ownSnap.exists() ? (ownSnap.data() as UserProfile) : null;
          if (own && own.subscriptionStatus !== "active" && own.lastMessageAt) {
            const until = new Date(own.lastMessageAt).getTime() + FREE_MESSAGE_COOLDOWN_MS;
            if (until > Date.now()) setCooldownUntil(until);
          }
        });
      } catch (err) {
        console.error("match chat load failed:", err);
        setError("Couldn't load this conversation. Try refreshing.");
      } finally {
        setLoading(false);
      }
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
      const body = await res.json().catch(() => ({}));
      // The server refused because the cooldown is still running — most
      // likely a second tab sent something, or the page was reopened.
      // Adopt its number rather than the local guess.
      if (res.status === 429) {
        setCooldownUntil(Date.now() + (body.retryAfterMs ?? FREE_MESSAGE_COOLDOWN_MS));
        capture("message_cooldown_hit");
        return;
      }
      if (!res.ok) {
        setError("Message couldn't be sent. Please try again.");
        return;
      }
      setDraft("");
      capture("message_sent");
      // Zero for subscribers, so the input never locks for them.
      if (body.cooldownMs) setCooldownUntil(Date.now() + body.cooldownMs);
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
        {/* Name plus freshness, as ThaiFriendly does in its chat header.
            Knowing whether the person is around right now changes what
            you write and how long you wait for a reply — Browse and the
            profile page both showed it and the conversation, where it
            matters most, didn't. */}
        {other && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={`/profile/${other.id}`} className="text-sm font-medium hover:underline">
              {other.displayName}
            </Link>
            {(() => {
              const activity = getActivityStatus(other.lastActiveAt);
              if (!activity) return null;
              return (
                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                  {activity.isOnline && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                  )}
                  {activity.label}
                </span>
              );
            })()}
          </div>
        )}
      </header>

      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-6">
        {loading && <p className="text-sm text-neutral-400">Loading…</p>}
        {!loading && !user && (
          <Link href="/sign-up" className="text-sm underline underline-offset-2">
            Sign in to view this conversation
          </Link>
        )}
        {!loading && notAllowed && <p className="text-sm text-neutral-500">This conversation isn&apos;t available.</p>}
        {!loading && user && !notAllowed && !match && error && (
          <p className="text-sm text-red-600">
            {error}{" "}
            <button onClick={() => window.location.reload()} className="underline underline-offset-2">
              Retry
            </button>
          </p>
        )}

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

            {/* The conversion moment for messaging, and the reason the
                cooldown is a cooldown rather than a daily quota: it lands
                mid-conversation, when skipping the wait is worth most.
                Says what's happening and offers the way out, rather than
                just greying the button. */}
            {onCooldown && (
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <span className="text-sm text-neutral-600">
                  Next message in{" "}
                  <span className="font-medium tabular-nums text-neutral-900">
                    {formatCountdown(cooldownRemaining)}
                  </span>
                </span>
                <Link
                  href="/premium"
                  onClick={() => capture("upgrade_clicked", { source: "message_cooldown" })}
                  className="text-sm font-medium text-neutral-900 underline underline-offset-2"
                >
                  Message without waiting
                </Link>
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2 border-t border-neutral-100 pt-4">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={onCooldown ? `You can write again in ${formatCountdown(cooldownRemaining)}` : "Message…"}
                // Left editable during the cooldown on purpose: someone
                // can compose their reply while they wait, and only the
                // send is held back.
                className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim() || onCooldown}
                className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {onCooldown ? formatCountdown(cooldownRemaining) : "Send"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
