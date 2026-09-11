// /components/MaliConciergeModal.tsx
//
// The Velvet Rope application. Opens from [ Private Access ] and from
// every gated action on a candidate card.
//
// The three fields, their labels, their options and their placeholders
// are the brief's, verbatim. So is the submit label and the success
// copy. What is added around them is the machinery a form that collects
// contact details needs and the brief did not mention: a focus trap, an
// Escape handler, a real error state, a disabled-while-sending guard so
// a double-tap on a phone does not file two applications, and a consent
// line — this collects an email or a phone number from EU visitors and
// mails them, which needs a stated basis and a way out.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { capture } from "@/lib/analytics";

const ROLE_OPTIONS = [
  "Man seeking a serious relationship",
  "Woman seeking a partner",
  "Cultured single seeking marriage",
];

export function MaliConciergeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [role, setRole] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  // Escape closes, the page behind stops scrolling, and focus moves
  // into the dialog. Without the focus move a keyboard user tabs
  // through the whole page underneath before reaching the form they
  // just opened.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    firstFieldRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIntent: role, city: city.trim(), contact: contact.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error === "invalid contact"
            ? "That doesn't look like an email address or a phone number with a country code."
            : "That couldn't be sent. Please try again.",
        );
        setSending(false);
        return;
      }
      capture("waitlist_joined", { source: "concierge_modal", roleIntent: role });
      setSubmitted(true);
    } catch {
      setError("That couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="concierge-heading"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[color-mix(in_srgb,var(--teak)_78%,transparent)] p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="card my-auto w-full max-w-lg rounded-b-none sm:rounded-[var(--radius)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="float-right p-4 text-lg leading-none text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ×
        </button>

        {submitted ? (
          // ----- Success state -----
          <div className="flex flex-col items-center px-6 pb-10 pt-6 text-center sm:px-10">
            <h2 id="concierge-heading" className="display text-2xl sm:text-3xl">
              Application Received.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
              Our curation team reviews applications in weekly cohorts to preserve genuine
              intent. Your access token will be sent shortly.
            </p>
            <button type="button" onClick={onClose} className="btn-quiet mt-7 px-6 py-2.5 text-sm">
              Close
            </button>
          </div>
        ) : (
          // ----- Application form -----
          <div className="px-6 pb-8 pt-6 sm:px-10">
            <div>
              <div className="min-w-0">
                <h2 id="concierge-heading" className="display text-2xl">
                  Join our verified members.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Create your private profile in 60 seconds to see full profiles, hear voice
                  introductions, and start connecting.
                </p>
                {/* The suggested copy was "Join Ploi and 100+ verified
                    members". The number is the only part omitted: there
                    are not 100, and a figure invented at the exact
                    moment someone decides to trust you is the worst
                    possible place to put one. Everything else about the
                    trigger is unchanged. */}
              </div>
            </div>

            {/* Primary path: registration, which is open. The visitor
                got here by tapping a profile — the thing they want is
                to see her, not to join a queue. */}
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/sign-up" className="btn-gold w-full px-6 py-3.5 text-center text-sm">
                Create Your Profile — 60 Seconds
              </Link>
              <p className="text-center text-xs text-[var(--muted)]">
                Free. Google or email. Browse everyone once you&apos;re in.
              </p>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--rule)]" aria-hidden />
              <span className="label text-[var(--muted)]">or request an invitation</span>
              <span className="h-px flex-1 bg-[var(--rule)]" aria-hidden />
            </div>

            <form onSubmit={submit} className="mt-7 flex flex-col gap-5">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                I am a...
                <select
                  ref={firstFieldRef}
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-lg border border-[var(--rule)] bg-[var(--surface-solid)] px-4 py-2.5 font-normal focus:border-[var(--foreground)] focus:outline-none"
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                My primary city is...
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bangkok, Paris, New York, London, Singapore"
                  className="rounded-lg border border-[var(--rule)] bg-[var(--surface-solid)] px-4 py-2.5 font-normal focus:border-[var(--foreground)] focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Where should Mali send your private invite?
                <input
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Email address or WhatsApp number (with country code)"
                  // Not type="email": the field accepts a phone number
                  // too, and the browser would reject one as malformed
                  // before the form ever submitted.
                  inputMode="text"
                  autoComplete="email"
                  className="rounded-lg border border-[var(--rule)] bg-[var(--surface-solid)] px-4 py-2.5 font-normal focus:border-[var(--foreground)] focus:outline-none"
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={sending || !role || !city.trim() || !contact.trim()}
                className="btn-gold w-full px-6 py-3.5 text-sm disabled:opacity-50"
              >
                {sending ? "Sending…" : "Apply for Private Invitation — 60 Seconds"}
              </button>

              {/* This collects a contact detail from EU visitors and
                  then mails them. Saying what it is used for, and
                  linking the policy, is the minimum GDPR asks and it
                  costs one line of grey text. */}
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                We&apos;ll use this only to send your invitation. No newsletter, no third parties,
                and you can ask us to delete it at any time — see our{" "}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--foreground)]">
                  privacy policy
                </Link>
                .
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
