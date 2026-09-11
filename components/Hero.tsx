// /components/Hero.tsx
//
// Section 1. Pitch left, photograph right.
//
// No mascot. Thirty women were asked to register against the version
// with Mali on it and none did; three had registered against the
// version without her. That is a small sample and it is still the only
// real evidence either way, and it points one direction. The
// illustrated concierge went with her.

"use client";

import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="canvas grid grid-cols-1 items-center gap-10 py-10 lg:grid-cols-12 lg:gap-14 lg:py-16">
      {/* ---------- Left: the pitch ---------- */}
      <div className="lg:col-span-6">
        <h1 className="display text-4xl leading-[1.06] lg:text-6xl">
          Done wasting time on dating apps?
        </h1>

        <p className="measure mt-5 text-lg leading-relaxed text-[var(--muted)]">
          Meet verified, marriage-minded people across Southeast Asia. Real intent, real
          verification, and no casual option — for anyone.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/sign-up" className="btn-gold px-7 py-3.5 text-center text-base">
            Join Free (Ladies)
          </Link>
          {/* Both doors, and neither is an anchor. "Explore the
              Community" pointed at the directory, which no longer
              renders while nobody has opted into the public showcase —
              a button that scrolls nowhere is worse than one that does
              something. Restore the anchor when the grid comes back. */}
          <Link href="/sign-up" className="btn-quiet px-7 py-3.5 text-center text-base">
            Create Gentleman Profile
          </Link>
        </div>

        <p className="mt-4 text-sm text-[var(--muted)]">
          Free for everyone to join · Your profile goes live as soon as your photos clear.
        </p>
      </div>

      {/* ---------- Right: the photograph ---------- */}
      <div className="lg:col-span-6">
        <div className="frame-teak relative overflow-hidden rounded-[var(--radius)] shadow-[var(--shadow-lift)]">
          <div className="relative aspect-[4/3] w-full">
            <Image
              src="/images/hero-fountain.webp"
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
