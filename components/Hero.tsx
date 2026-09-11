// /components/Hero.tsx
//
// Section 1: the romantic dream.
//
// Left column carries the pitch and the two doors. Right column is the
// Wat Arun couple at sunset, with Mali as a frosted concierge card
// overlapping its bottom corner — not a separate element sharing a row,
// which is what made the previous version read as a 2005 forum avatar.
//
// The two CTAs are the whole strategy compressed into two buttons. This
// marketplace has two populations with opposite needs: women have to be
// able to join in under two minutes and go live immediately, and men
// have to see who is inside before anyone asks them for anything. One
// generic "Apply for Private Invitation" served neither, and actively
// repelled the supply side — a woman with Tinder, Bumble and
// ThaiFriendly already on her phone does not wait a week for an
// unproven app to review her.

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

        {/* Two doors, labelled by who walks through them. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/sign-up" className="btn-gold px-7 py-3.5 text-center text-base">
            Join Free (Ladies)
          </Link>
          <a href="#directory" className="btn-quiet px-7 py-3.5 text-center text-base">
            Explore the Community
          </a>
        </div>

        <p className="mt-4 text-sm text-[var(--muted)]">
          Free for everyone to join · Your profile goes live as soon as your photos clear.
        </p>
      </div>

      {/* ---------- Right: the visual anchor ---------- */}
      <div className="lg:col-span-6">
        <div className="frame-teak relative overflow-hidden rounded-[var(--radius)] shadow-[var(--shadow-lift)]">
          {/* The Chao Phraya terrace at golden hour. object-[28%] keeps
              the couple in frame as the container narrows — they sit in
              the left third of this photograph, so a centred crop loses
              them to the river. */}
          <div className="relative aspect-[4/3] w-full sm:aspect-[3/2]">
            <Image
              src="/images/hero-terrace.webp"
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-[28%_center]"
            />
            {/* Just enough teak at the foot to seat the concierge card;
                the faces stay untouched. */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--teak)]/75 to-transparent" />
          </div>

          {/* Mali, overlapping the photograph rather than beside it. */}
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs">
            <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--gold)_40%,transparent)] bg-[color-mix(in_srgb,var(--cream)_88%,transparent)] p-3 shadow-lg backdrop-blur-md">
              {/* A circular gold-rimmed avatar rather than her full
                  figure. Squeezed into a 64px card her face — which is
                  the entire point of a concierge — was unreadable at
                  a full-body crop. */}
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_20%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--gold)_70%,transparent)]">
                <Image
                  src="/mascots/mali-avatar.webp"
                  alt=""
                  aria-hidden
                  width={112}
                  height={112}
                  className="h-14 w-14 rounded-full object-cover"
                />
              </span>
              <p className="text-xs leading-relaxed">
                &ldquo;Sawasdee ka! I&apos;m Mali, your personal guide to verified singles.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
