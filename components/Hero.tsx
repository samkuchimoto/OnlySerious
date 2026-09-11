// /components/Hero.tsx
//
// Full-bleed photograph with the copy over it, which is how the version
// that actually converted was built. The two-column card layout that
// replaced it shrank the couple into a thumbnail beside a wall of text.

"use client";

import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex min-h-[88vh] flex-col overflow-hidden">
      <Image
        src="/images/hero-fountain.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Bottom-up scrim with explicit stops rather than Tailwind's
          even thirds. The foot of this frame is bright — sunlit water
          and a pale dress — and an evenly spread gradient left the
          outlined button washed out against it. Solid teak at the base,
          clear by 68%, so both faces stay untouched. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--teak)_0%,color-mix(in_srgb,var(--teak)_82%,transparent)_28%,color-mix(in_srgb,var(--teak)_40%,transparent)_50%,transparent_68%)]" />

      <div className="canvas relative z-10 mt-auto pb-16 sm:pb-24">
        <h1 className="display max-w-3xl text-5xl leading-[1.04] text-[var(--cream)] sm:text-6xl lg:text-7xl">
          Done wasting time on dating apps?
        </h1>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/sign-up" className="btn-gold px-8 py-4 text-center text-base">
            Join Free (Ladies)
          </Link>
          {/* Deliberately not .btn-quiet. That class is defined after
              Tailwind's utilities in globals.css, so its own `color` and
              `border` beat any text-/border- utility added here — the
              button rendered teak-on-teak and vanished into the
              photograph. Styled explicitly so nothing overrides it, with
              its own backing so it stays legible over a sunlit frame. */}
          <Link
            href="/sign-up"
            className="rounded-full border border-[var(--cream)]/70 bg-[color-mix(in_srgb,var(--teak)_55%,transparent)] px-8 py-4 text-center text-base font-semibold text-[var(--cream)] backdrop-blur-sm transition-colors hover:bg-[color-mix(in_srgb,var(--teak)_78%,transparent)]"
          >
            Create Gentleman Profile
          </Link>
        </div>
      </div>
    </section>
  );
}
