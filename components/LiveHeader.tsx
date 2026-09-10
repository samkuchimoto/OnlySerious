// /components/LiveHeader.tsx
//
// The Live Presence Bar and the public navbar.
//
// Structure is the brief's: a sticky ambient banner with a pulsing
// green indicator, the Golden Amber Lotus mark, and a [ Private Access ]
// button that opens the concierge modal.
//
// ---------------------------------------------------------------------
// The number is real, and it had to be.
//
// The brief specified the literal string "142 members active right now
// across Bangkok, Cebu & Da Nang". That number is fetched from
// /api/showcase now, because a false one is a misleading commercial
// practice under EU 2005/29/EC — which reaches this operator directly —
// and because it is trivially falsifiable by the only people who
// matter: the ones who join and then count the green dots.
//
// The copy therefore has three states rather than one:
//
//   people online now   → "N members active right now across …"
//   nobody online, but
//   a real registry     → "N verified members across …" — true, still
//                         a reason to apply, and not a presence claim
//   nothing yet         → the bar does not render at all
//
// An empty sanctuary says nothing. An empty sanctuary claiming to be
// full says something much worse, and says it to exactly the sceptical
// audience this page is written for.
// ---------------------------------------------------------------------

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";

const CITIES = "Bangkok, Cebu & Da Nang";

export function LiveHeader({ onPrivateAccess }: { onPrivateAccess: () => void }) {
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/showcase")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setLiveCount(d.liveCount ?? 0);
        setMemberCount(d.memberCount ?? 0);
      })
      // A failed count is simply no bar. It is decoration on a marketing
      // page, not something worth an error state.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const showPresence = (liveCount ?? 0) > 0;
  const showRegistry = !showPresence && (memberCount ?? 0) > 0;

  return (
    <header className="sticky top-0 z-40">
      {/* The ambient presence bar. Teak ground so it reads as a ribbon
          above the page rather than as part of the hero photograph. */}
      {(showPresence || showRegistry) && (
        <div className="bg-[var(--teak)] text-[var(--cream)]" aria-live="polite">
          <div className="canvas flex items-center justify-center gap-2.5 py-2 text-center">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--celadon)] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--celadon)]" />
            </span>
            <p className="text-xs sm:text-sm">
              {showPresence ? (
                <>
                  <span className="font-semibold tabular-nums">{liveCount}</span>{" "}
                  {liveCount === 1 ? "member" : "members"} active right now
                </>
              ) : (
                <>
                  <span className="font-semibold tabular-nums">{memberCount}</span> verified{" "}
                  {memberCount === 1 ? "member" : "members"}
                </>
              )}{" "}
              <span className="text-[var(--cream)]/70">across {CITIES}</span>
            </p>
          </div>
        </div>
      )}

      {/* The navbar. Translucent cream over the hero, so the photograph
          scrolls under it instead of being cut off by an opaque bar. */}
      <div className="nav-sanctuary">
        <div className="canvas flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2.5">
            {/* The Golden Amber Lotus. This is the gold lotus plate from
                the brand set — the same asset the gift token uses, which
                is deliberate: the mark and the courtesy are one symbol. */}
            <Image
              src="/gifts/amber-lotus.webp"
              alt=""
              aria-hidden
              width={32}
              height={32}
              priority
              className="h-8 w-8 object-contain"
            />
            <span className="display text-xl">{BRAND_CONFIG.appTitle}</span>
          </Link>

          <button type="button" onClick={onPrivateAccess} className="btn-gold px-5 py-2 text-sm">
            Private Access
          </button>
        </div>
      </div>
    </header>
  );
}
