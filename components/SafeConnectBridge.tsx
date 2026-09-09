// /components/SafeConnectBridge.tsx
//
// The chat-side UI for the Safe Connect Bridge (blueprint Step 3).
//
// Every rule shown here is also enforced in app/api/contact-exchange —
// this component decides what to *show*, never what is *allowed*. The
// progress line before the gate opens is the part worth defending: a
// button that is simply absent teaches nothing, and one that is greyed
// out with no reason invites a support message. Saying "three more
// messages each" makes the rule legible, and a legible rule reads as a
// safety feature rather than as a paywall.

"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { CONTACT_CHANNELS, type ContactChannel } from "@/lib/types";

type BridgeState = {
  unlocked: boolean;
  sentByMe: number;
  required: number;
  status: "pending" | "accepted" | "declined" | null;
  iAmRequester: boolean;
  channel: ContactChannel | null;
  revealed: { theirs?: string; mine?: string; channel: ContactChannel } | null;
};

const CHANNEL_LABEL: Record<ContactChannel, string> = {
  line: "LINE",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

export function SafeConnectBridge({
  user,
  matchId,
  otherName,
  messageCount,
}: {
  user: User | null;
  matchId: string;
  otherName: string;
  /** Only used to re-check when the conversation grows — the count that
   *  decides anything is the server's, never this one. */
  messageCount: number;
}) {
  const [state, setState] = useState<BridgeState | null>(null);
  const [handle, setHandle] = useState("");
  const [channel, setChannel] = useState<ContactChannel>("line");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/contact-exchange?matchId=${encodeURIComponent(matchId)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return;
      setState(await res.json());
    } catch {
      // Silent: this is an enhancement on top of a working chat, and a
      // failed fetch here should never take the conversation with it.
    }
  }, [user, matchId]);

  useEffect(() => {
    load();
  }, [load, messageCount]);

  async function send(body: Record<string, unknown>) {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/contact-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ ...body, matchId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          payload.error === "handle_rejected"
            ? "That handle can't be shared. Check it and try again."
            : payload.error === "conversation_too_short"
              ? "Keep talking a little longer first."
              : "Something went wrong. Try again.",
        );
        return;
      }
      setComposing(false);
      setHandle("");
      await load();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  // Accepted — both handles on the table. Shown permanently in the
  // thread rather than as a dismissible toast, because the whole reason
  // people paste numbers into chat is so they can scroll back and find
  // them later.
  if (state.status === "accepted" && state.revealed) {
    return (
      <div className="card-gold mx-auto my-4 max-w-md p-4">
        <p className="label text-[var(--muted)]">Contacts shared</p>
        <p className="mt-2 text-sm">
          <span className="font-semibold">{otherName} on {CHANNEL_LABEL[state.revealed.channel]}:</span>{" "}
          <span className="select-all">{state.revealed.theirs}</span>
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          You shared: <span className="select-all">{state.revealed.mine}</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
          You can still report or block {otherName} here after moving to another app.
        </p>
      </div>
    );
  }

  // Pending, and it is on me to answer.
  if (state.status === "pending" && !state.iAmRequester) {
    return (
      <div className="card-gold mx-auto my-4 max-w-md p-4">
        <p className="label text-[var(--muted)]">Contact exchange</p>
        <p className="mt-2 text-sm">
          {otherName} would like to swap {state.channel ? CHANNEL_LABEL[state.channel] : "contact"}{" "}
          details. Share yours to see theirs.
        </p>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={`Your ${state.channel ? CHANNEL_LABEL[state.channel] : ""} ID`}
          className="mt-3 w-full rounded-lg border border-[var(--rule)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
        />
        {error && <p className="mt-2 text-xs text-[var(--terracotta)]">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy || handle.trim().length < 2}
            onClick={() => send({ action: "accept", handle: handle.trim() })}
            className="btn-gold flex-1 px-4 py-2.5 text-sm"
          >
            Share and reveal
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => send({ action: "decline" })}
            className="btn-quiet px-4 py-2.5 text-sm"
          >
            Not yet
          </button>
        </div>
        {/* Declining is silent and says so. Someone deciding whether to
            turn this down needs to know it will not start an argument. */}
        <p className="mt-2 text-xs text-[var(--muted)]">
          Declining is private — {otherName} isn&apos;t told.
        </p>
      </div>
    );
  }

  if (state.status === "pending" && state.iAmRequester) {
    return (
      <p className="mx-auto my-4 max-w-md text-center text-xs text-[var(--muted)]">
        Contact details offered — waiting for {otherName} to respond.
      </p>
    );
  }

  // Not yet earned. Show the distance, not a locked button.
  if (!state.unlocked) {
    const left = Math.max(0, state.required - state.sentByMe);
    return (
      <p className="mx-auto my-4 max-w-md text-center text-xs leading-relaxed text-[var(--muted)]">
        {left > 0
          ? `Swap LINE or WhatsApp details after you've each sent ${state.required} messages — ${left} more from you.`
          : `You've sent enough — contact sharing unlocks once ${otherName} has replied ${state.required} times too.`}
      </p>
    );
  }

  // Unlocked, nothing pending (or a previous request was declined).
  if (!composing) {
    return (
      <div className="my-4 text-center">
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="btn-quiet px-5 py-2.5 text-sm"
        >
          Share contact details
        </button>
      </div>
    );
  }

  return (
    <div className="card mx-auto my-4 max-w-md p-4">
      <p className="label text-[var(--muted)]">Share contact details</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
        {otherName} sees your handle only if they share theirs back.
      </p>
      <div className="mt-3 flex gap-2">
        {CONTACT_CHANNELS.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={channel === c.value}
            onClick={() => setChannel(c.value)}
            className={`label rounded-full px-3 py-1.5 transition-colors ${
              channel === c.value
                ? "bg-[var(--foreground)] text-white"
                : "border border-[var(--rule)] text-[var(--muted)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder={`Your ${CHANNEL_LABEL[channel]} ID`}
        className="mt-3 w-full rounded-lg border border-[var(--rule)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
      />
      {error && <p className="mt-2 text-xs text-[var(--terracotta)]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || handle.trim().length < 2}
          onClick={() => send({ action: "request", channel, handle: handle.trim() })}
          className="btn-gold flex-1 px-4 py-2.5 text-sm"
        >
          Send
        </button>
        <button type="button" onClick={() => setComposing(false)} className="btn-quiet px-4 py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
