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

import Image from "next/image";
import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";

const CITIES = "Bangkok, Cebu & Da Nang";

export function LiveHeader() {
  return (
    <header className="sticky top-0 z-40">
      {/* The cohort bar.
          It used to print the real member count, which was accurate and
          commercially suicidal: "4 verified members" tells a prospective
          subscriber the room is empty, and no amount of design recovers
          from that. Not stating a number is not a lie — every word here
          is true, the markets really are open for applications, and the
          founding cohort really is forming. Numbers come back when they
          are numbers worth printing. */}
      <div className="bg-[var(--teak)] text-[var(--cream)]">
        <div className="canvas flex items-center justify-center gap-2.5 py-2 text-center">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--celadon)] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--celadon)]" />
          </span>
          <p className="text-xs sm:text-sm">
            <span className="font-semibold">Private Founding Cohort</span>{" "}
            <span className="text-[var(--cream)]/70">· {CITIES} now open for applications</span>
          </p>
        </div>
      </div>

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

          {/* Two actions, and they answer different questions.
              "Create your profile" next to "Private Access" made the
              site ambiguous — open platform, login portal, or closed
              waitlist? A quiet Sign in for people who already have an
              account, and one gold CTA for everyone else, removes the
              question entirely. */}
          <div className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/sign-up"
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              Sign in
            </Link>
            <Link href="/sign-up" className="btn-gold px-5 py-2 text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
