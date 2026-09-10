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
import { SafeConnectBridge } from "@/components/SafeConnectBridge";
import { GiftMessage, GiftPicker } from "@/components/GiftPicker";
import {
  LanternsMessage,
  TwoLanterns,
  decodeLanterns,
  encodeLanterns,
} from "@/components/TwoLanterns";
import { decodeGift, encodeGift, type Gift } from "@/lib/gifts";
import { FREE_OPENING_COOLDOWN_MS, type Match, type Message, type UserProfile } from "@/lib/types";

// The window is now twelve hours, not ten minutes, so the old mm:ss
// formatter rendered "719:00" — a number nobody can read as half a day.
// Coarse units instead: hours while there are hours left, then minutes,
// then seconds at the very end, which is the only point where a ticking
// second is information rather than noise.
function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.floor(total / 60);
  if (minutes >= 1) return `${minutes} min`;
  return `${total}s`;
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
  // Absolute wall-clock time the next conversation may be opened, not a
  // remaining-seconds number — a counter that only decrements while the
  // tab is focused would drift and let the input unlock early.
  //
  // "Pending" because it is only a real cooldown in a conversation the
  // other person has never spoken in. Replies are always free on the
  // free tier, so the same stored timestamp must lock this input in a
  // silent thread and leave it open in a live one.
  const [pendingCooldownUntil, setPendingCooldownUntil] = useState<number | null>(null);
  // Drives which courtship tokens the picker offers. Read from the
  // profile this screen already loads, rather than a second fetch.
  const [ownSubscriptionStatus, setOwnSubscriptionStatus] = useState<string | undefined>();
  const [now, setNow] = useState(() => Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Ticks only while a cooldown is actually running.
  useEffect(() => {
    if (pendingCooldownUntil === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pendingCooldownUntil]);

  // Has the other side ever written here? Mirrors the server's own test
  // in app/api/messages — if they have, nothing this screen does is
  // gated at all.
  const otherHasSpoken = messages.some((m) => m.senderId !== user?.uid);

  const cooldownRemaining =
    pendingCooldownUntil === null || otherHasSpoken
      ? 0
      : Math.max(0, pendingCooldownUntil - now);
  const onCooldown = cooldownRemaining > 0;

  // Each side's Two Lanterns round, so a card can mark the answers the
  // two of them gave in common. First played wins if somebody replays —
  // the game is meant to be answered once.
  const myLanterns =
    messages.map((m) => (m.senderId === user?.uid ? decodeLanterns(m.text) : null)).find(Boolean) ??
    null;
  const theirLanterns =
    messages.map((m) => (m.senderId !== user?.uid ? decodeLanterns(m.text) : null)).find(Boolean) ??
    null;

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
          //
          // It only ever applies to a conversation the other person has
          // not spoken in: replying is free and instant on the free tier
          // (see lib/types.ts), so showing a countdown inside an active
          // conversation would lock an input the server would happily
          // have accepted.
          const ownSnap = await getDoc(doc(db, "users", nextUser.uid));
          const own = ownSnap.exists() ? (ownSnap.data() as UserProfile) : null;
          setOwnSubscriptionStatus(own?.subscriptionStatus);
          if (own && own.subscriptionStatus !== "active" && own.lastOpenedConversationAt) {
            const until =
              new Date(own.lastOpenedConversationAt).getTime() + FREE_OPENING_COOLDOWN_MS;
            if (until > Date.now()) setPendingCooldownUntil(until);
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

  // Gifts and lantern rounds are messages, so they go through exactly
  // the same route — inheriting moderation, the block check, the
  // messaging gate and push notification for free. Only the text
  // differs.
  async function sendGift(gift: Gift) {
    await postMessage(encodeGift(gift.id));
  }

  async function sendLanterns(answers: number[]) {
    await postMessage(encodeLanterns(answers));
  }

  async function postMessage(text: string) {
    if (!user) return;
    setError(null);
    setSending(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ matchId, text }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setPendingCooldownUntil(Date.now() + (body.retryAfterMs ?? FREE_OPENING_COOLDOWN_MS));
        capture("message_cooldown_hit");
        return;
      }
      if (!res.ok) {
        setError("That couldn't be sent. Please try again.");
        return;
      }
      if (body.cooldownMs) setPendingCooldownUntil(Date.now() + body.cooldownMs);
    } catch {
      setError("That couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

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
        setPendingCooldownUntil(Date.now() + (body.retryAfterMs ?? FREE_OPENING_COOLDOWN_MS));
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
      if (body.cooldownMs) setPendingCooldownUntil(Date.now() + body.cooldownMs);
    } catch {
      setError("Message couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col text-[var(--foreground)]">
      <header className="canvas flex items-center gap-4 py-6">
        <Link href="/matches" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
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
                <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  {activity.isOnline && (
                    <span className="dot-online dot-online-pulse h-1.5 w-1.5" aria-hidden />
                  )}
                  {activity.label}
                </span>
              );
            })()}
          </div>
        )}
      </header>

      <section className="canvas measure flex flex-1 flex-col pb-6">
        {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
        {!loading && !user && (
          <Link href="/sign-up" className="text-sm underline underline-offset-2">
            Sign in to view this conversation
          </Link>
        )}
        {!loading && notAllowed && <p className="text-sm text-[var(--muted)]">This conversation isn&apos;t available.</p>}
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
                <p className="text-sm text-[var(--muted)]">
                  You matched — say something about {other?.displayName ?? "their"} profile to start.
                </p>
              )}
              {messages.map((message) => {
                const isMine = message.senderId === user?.uid;

                // Gifts and Two Lanterns rounds ride the message
                // pipeline with a marker rather than living in their own
                // collections — see lib/gifts.ts. They are decoded here,
                // and anything that does not parse falls through to a
                // plain bubble, so a malformed payload degrades to text
                // instead of rendering an empty card.
                const gift = decodeGift(message.text);
                if (gift) return <GiftMessage key={message.id} gift={gift} mine={isMine} />;

                const lanterns = decodeLanterns(message.text);
                if (lanterns) {
                  return (
                    <LanternsMessage
                      key={message.id}
                      answers={lanterns}
                      mine={isMine}
                      theirAnswers={isMine ? theirLanterns : myLanterns}
                    />
                  );
                }

                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMine
                          ? "bg-[var(--teak)] text-[var(--cream)]"
                          : "bg-[color-mix(in_srgb,var(--teak)_10%,var(--cream))] text-[var(--foreground)]"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                );
              })}

              {/* Offered only before either side has played, and only
                  once a conversation exists — a game button above an
                  empty thread competes with the opener it is meant to
                  replace. */}
              {messages.length > 0 && !myLanterns && (
                <div className="py-2">
                  <TwoLanterns disabled={onCooldown || sending} onPlay={sendLanterns} />
                </div>
              )}
              {/* The Safe Connect Bridge sits at the foot of the thread,
                  after the last message — it is the natural next step of
                  a conversation, not a banner above one. */}
              <SafeConnectBridge
                user={user}
                matchId={matchId}
                otherName={other?.displayName ?? "They"}
                messageCount={messages.length}
              />

              <div ref={bottomRef} />
            </div>

            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

            {/* The conversion moment for messaging: it lands at the
                point of peak outbound intent, which is where the audit
                puts the gate. The second line matters as much as the
                first — this only ever blocks *opening* a conversation,
                and someone who reads "next message in 11h" without being
                told they can still reply to anyone will reasonably think
                the app has frozen their inbox. */}
            {onCooldown && (
              <div className="card-gold mb-3 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-sm text-[var(--muted)]">
                    You can start another conversation in{" "}
                    <span className="font-medium tabular-nums text-[var(--foreground)]">
                      {formatCountdown(cooldownRemaining)}
                    </span>
                  </span>
                  <Link
                    href="/premium"
                    onClick={() => capture("upgrade_clicked", { source: "message_cooldown" })}
                    className="text-sm font-medium text-[var(--foreground)] underline underline-offset-2"
                  >
                    Message without waiting
                  </Link>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Replying to anyone who has written to you is always free and immediate.
                </p>
              </div>
            )}

            {/* `relative` anchors the gift picker's popover, which opens
                upward so it never covers the thread it is being sent
                into. */}
            <form
              onSubmit={handleSend}
              className="relative flex gap-2 border-t border-[var(--rule)] pt-4"
            >
              <GiftPicker
                subscriptionStatus={ownSubscriptionStatus}
                disabled={onCooldown || sending}
                onSend={sendGift}
              />
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  onCooldown ? `Opens again in ${formatCountdown(cooldownRemaining)}` : "Message…"
                }
                // Left editable during the cooldown on purpose: someone
                // can compose their reply while they wait, and only the
                // send is held back.
                className="flex-1 rounded-full border border-[var(--rule)] px-4 py-2.5 text-sm focus:border-[var(--foreground)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim() || onCooldown}
                className="rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-medium text-[var(--cream)] disabled:opacity-50"
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
