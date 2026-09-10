// /components/GiftPicker.tsx
//
// Sending a courtship token, and rendering one that has arrived.
//
// See lib/gifts.ts for why these are bundled with membership rather
// than sold individually, and why a gift is an ordinary message with a
// marker rather than its own collection.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GIFTS, canSend, type Gift } from "@/lib/gifts";
import { capture } from "@/lib/analytics";

/**
 * A gift as it appears in the thread.
 *
 * Rendered as a card rather than a chat bubble because a bubble sized
 * to an illustration is a bubble that looks broken, and because the
 * whole point of a token is that it stands apart from the text around
 * it.
 */
export function GiftMessage({ gift, mine }: { gift: Gift; mine: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="card-gold flex max-w-[15rem] flex-col items-center gap-1 p-4 text-center">
        {gift.image ? (
          <Image
            src={gift.image}
            alt=""
            aria-hidden
            width={112}
            height={112}
            className="h-28 w-28 object-contain"
          />
        ) : (
          // The coffee invitation has no plate of its own. A brass ring
          // with the cup in it reads as deliberate at this size, where a
          // bare emoji would read as a missing asset.
          <span
            aria-hidden
            className="flex h-28 w-28 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] text-4xl"
          >
            ☕
          </span>
        )}
        <p className="display mt-1 text-base">{gift.name}</p>
        <p className="text-xs leading-relaxed text-[var(--muted)]">{gift.meaning}</p>
      </div>
    </div>
  );
}

export function GiftPicker({
  subscriptionStatus,
  disabled,
  onSend,
}: {
  subscriptionStatus: string | undefined;
  disabled?: boolean;
  onSend: (gift: Gift) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  async function pick(gift: Gift) {
    setSending(gift.id);
    capture("gift_sent", { gift: gift.id });
    await onSend(gift);
    setSending(null);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-label="Send a token"
        className="shrink-0 rounded-full border border-[var(--rule)] px-3.5 py-2.5 text-base leading-none transition-colors hover:border-[color-mix(in_srgb,var(--gold)_50%,var(--rule))] disabled:opacity-40"
      >
        <span aria-hidden>❁</span>
      </button>

      {open && (
        <div className="card absolute bottom-full left-0 right-0 mb-2 p-4">
          <p className="label text-[var(--gold-deep)]">Send a token</p>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {GIFTS.map((gift) => {
              const allowed = canSend(gift, subscriptionStatus);
              return (
                <li key={gift.id}>
                  <button
                    type="button"
                    onClick={() => (allowed ? pick(gift) : undefined)}
                    disabled={!allowed || sending !== null}
                    // Not hidden when locked. Someone has to be able to
                    // see what membership includes in order to want it,
                    // and a picker that silently omits two of three
                    // options just looks empty.
                    className={`flex w-full flex-col items-center gap-1.5 rounded-[var(--radius)] border p-2.5 text-center transition-colors ${
                      allowed
                        ? "border-[var(--rule)] hover:border-[color-mix(in_srgb,var(--gold)_50%,var(--rule))]"
                        : "border-[var(--rule)] opacity-55"
                    }`}
                  >
                    {gift.image ? (
                      <Image
                        src={gift.image}
                        alt=""
                        aria-hidden
                        width={56}
                        height={56}
                        className="h-14 w-14 object-contain"
                      />
                    ) : (
                      <span aria-hidden className="flex h-14 w-14 items-center justify-center text-2xl">
                        ☕
                      </span>
                    )}
                    <span className="text-[0.7rem] font-semibold leading-tight">{gift.name}</span>
                    {!allowed && <span className="label text-[0.5rem] text-[var(--gold-deep)]">Gold</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {subscriptionStatus !== "active" && (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Jasmine and lotus come with{" "}
              <Link
                href="/premium"
                onClick={() => capture("upgrade_clicked", { source: "gift_picker" })}
                className="underline underline-offset-2 hover:text-[var(--foreground)]"
              >
                Gold VIP
              </Link>
              . Nothing is charged per token.
            </p>
          )}
        </div>
      )}
    </>
  );
}
