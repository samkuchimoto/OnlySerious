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
export function LiveHeader() {
  return (
    <header className="sticky top-0 z-40">
      {/* The cohort ribbon used to live here. It has moved into the
          hero as a gold eyebrow pill: two statements of the same fact a
          hundred pixels apart is clutter, and the pill is the better
          placed of the two. */}
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

          {/* Centre pill. Carries the cohort framing that used to be a
              full-width ribbon — same message, a third of the vertical
              space, and it no longer competes with the hero. Hidden on
              phones, where the wordmark and two actions already fill
              the row. */}
          <span className="label hidden items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--gold)_45%,transparent)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] px-3.5 py-1.5 text-[0.6rem] text-[var(--gold-deep)] lg:inline-flex">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--celadon)]" />
            Founding Cohort Now Open
          </span>
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
              Join Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
