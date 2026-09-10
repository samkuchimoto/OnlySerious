// /components/Hero.tsx
//
// The two-column luxury split. Editorial pitch left, Mali right.
//
// ---------------------------------------------------------------------
// What was wrong, and what fixes it.
//
// The previous hero put Mali on the left as a 48px full-body cutout
// beside a bordered grey speech box, with the entire right half of a
// 1440px screen left empty. Three separate failures compounding: she
// was too small for her face or her silk to read at all, the bubble was
// a detached rectangle that broke the flow of the headline above it,
// and the blank right side made the page look unfinished.
//
// The fix is a disciplined 12-column split. Type occupies seven
// columns, Mali five, and she is rendered at 380–440px tall so she
// reads as a hostess rather than an icon. She is not floating on flat
// cream: an arch with a radial gold wash sits behind her, and the
// greeting is a frosted card overlapping her base rather than a box
// parked next to her head.
//
// The vertical budget is deliberate. Faces still have to be near the
// fold — that was the last round's correction and it still holds — so
// the hero is capped at roughly 500px rather than the full viewport
// height a hero usually takes. The first row of the grid stays visible
// on a laptop.
// ---------------------------------------------------------------------

"use client";

import Image from "next/image";
import Link from "next/link";

// Real claims only.
//
// The brief asked for "✓ 100% Free for Ladies". It is dropped, for the
// same reason the messaging gate is not gender-conditional: pricing
// that differs by sex is prohibited in access to goods and services
// under EU 2004/113/EC, and this operator is squarely inside its scope.
// It is also not what the code does — the free tier is free for
// everyone. "Free to join" is the true version of the same promise and
// costs nothing in persuasion.
const PROOF_POINTS = ["Identity & intent verified", "Free to join", "No casual option"];

export function Hero() {
  return (
    <section className="canvas grid grid-cols-1 items-center gap-10 py-12 lg:grid-cols-12 lg:gap-12 lg:py-16">
      {/* ---------- Left: the editorial pitch ---------- */}
      <div className="lg:col-span-7">
        <span className="label inline-block rounded-full border border-[color-mix(in_srgb,var(--gold)_45%,transparent)] bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] px-3 py-1.5 text-[0.6rem] text-[var(--gold-deep)]">
          Private Founding Cohort · Bangkok &amp; Southeast Asia
        </span>

        <h1 className="display mt-5 text-4xl leading-[1.06] lg:text-6xl">
          Curated, Meaningful Connections Between the West and Asia.
        </h1>

        <p className="measure mt-5 text-lg leading-relaxed text-[var(--muted)]">
          A private, vetted sanctuary for verified professionals, cultured singles, and intentional
          cross-cultural love.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Anchors to the grid rather than navigating. The whole
              argument of this page is the faces below it, and sending
              someone to a signup form before they have seen anybody is
              what the guest-teaser sequence exists to avoid. */}
          <a href="#directory" className="btn-gold px-8 py-3.5 text-base">
            Explore the Sanctuary
          </a>
          <Link
            href="/sign-up"
            className="text-sm font-semibold text-[var(--foreground)] underline underline-offset-4"
          >
            Sign in
          </Link>
        </div>

        <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
          {PROOF_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <span aria-hidden className="text-[var(--celadon)]">
                ✓
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* ---------- Right: Mali, staged ---------- */}
      <div className="lg:col-span-5">
        <div className="relative mx-auto flex max-w-sm flex-col items-center">
          {/* The stage. An arch of warm gold behind her, so she stands
              in something rather than on nothing. aria-hidden and
              pointer-events-none: it is lighting, not content. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-4 top-0 h-[85%] rounded-t-full bg-[radial-gradient(circle_at_50%_45%,color-mix(in_srgb,var(--gold)_30%,transparent)_0%,transparent_72%)]"
          />

          <Image
            src="/mascots/mali-wai-cut.webp"
            alt=""
            aria-hidden
            width={420}
            height={1358}
            priority
            sizes="(max-width: 1024px) 60vw, 380px"
            className="relative h-[340px] w-auto object-contain drop-shadow-2xl sm:h-[400px] lg:h-[440px]"
          />

          {/* The greeting, overlapping her base. Attached rather than
              adjacent — that overlap is the whole difference between a
              designed composition and two elements sharing a row. */}
          <div className="card-gold relative -mt-8 w-full px-5 py-4 backdrop-blur-md">
            <p className="flex items-start gap-2 text-sm leading-relaxed">
              <span aria-hidden className="mt-0.5 shrink-0 text-[var(--gold)]">
                ★
              </span>
              <span>
                &ldquo;Sawasdee ka! I&apos;m Mali, your personal guide to verified singles across
                Thailand, the Philippines, and Vietnam.&rdquo;
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
