"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";
import { InAppBrowserWarning } from "@/components/InAppBrowserWarning";
import { LiveHeader } from "@/components/LiveHeader";
import { Hero } from "@/components/Hero";
import { DiscoveryGrid } from "@/components/DiscoveryGrid";
import { MaliConciergeModal } from "@/components/MaliConciergeModal";
import { Lanterns } from "@/components/Lanterns";

// Real differentiators only — nothing listed here that isn't actually
// enforced in code. The photo policy is a real Vision SafeSearch check
// and the intent gate is a required field, not marketing copy.
const DIFFERENTIATORS = [
  {
    title: "Verified for intent, not just photos",
    body: "Every profile states what they're actually looking for — long-term, not \"not sure yet.\"",
  },
  {
    title: "A strict photo policy",
    body: "No shirtless, swimwear, or underwear photos. Every upload is checked before it goes live.",
  },
  {
    title: "Built for long-term, not for the weekend",
    body: "Everyone here chooses marriage, a long-term relationship, or building a life together. There is no casual option.",
  },
];

// ---------------------------------------------------------------------
// The Living Velvet Rope homepage.
//
// The page is a client component because the whole layout hangs off one
// piece of state — whether the concierge modal is open — and every
// gated affordance in the header and the grid has to be able to set it.
// The alternative was a context provider for a single boolean.
//
// The hero photograph stays below the discovery grid rather than above
// it. The velvet-rope mechanic depends on the visitor meeting the
// community before they meet the pitch: a scrollable grid they cannot
// touch is the hook, and a full-bleed photograph on top of it would
// push that below the fold on every phone.
// ---------------------------------------------------------------------
export default function Home() {
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const openConcierge = () => setConciergeOpen(true);

  return (
    <main className="flex-1">
      <LiveHeader />

      <div className="canvas pt-4">
        <InAppBrowserWarning />
      </div>

      <Hero />

      <DiscoveryGrid onGate={openConcierge} />

      {/* The aspirational band. Photography as setting, under its own
          heading, so it reads as the world the community lives in
          rather than as a claim about who is in it. */}
      <section className="relative flex min-h-[60vh] flex-col overflow-hidden border-y border-[var(--rule)]">
        <Image
          src="/images/hero-terrace.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[22%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--teak)]/88 via-[var(--teak)]/25 to-transparent sm:bg-gradient-to-l sm:from-[var(--teak)]/90 sm:via-[var(--teak)]/45 sm:to-transparent" />
        <Lanterns />

        <div className="canvas relative z-10 flex flex-1 flex-col justify-end py-16 sm:py-24">
          <div className="text-center sm:ml-auto sm:max-w-lg sm:text-left">
            <h2 className="display text-3xl leading-[1.05] text-[var(--cream)] sm:text-4xl lg:text-5xl">
              {BRAND_CONFIG.heroHeadline}
            </h2>
            <p className="mt-5 text-lg text-[var(--cream)]/85">{BRAND_CONFIG.heroSubheadline}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:items-start">
              <Link href="/sign-up" className="btn-gold px-9 py-4 text-base">
                Create Your Profile
              </Link>
              <p className="text-sm text-[var(--cream)]/70">
                Free to join · {BRAND_CONFIG.tagline}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="canvas grid gap-8 sm:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <div key={item.title}>
              <p className="display text-xl">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Members already inside still need a way in, and someone who
          wants the app rather than the waitlist should not have to
          apply for it. Kept quiet and last so it never competes with
          the application. */}
      <section className="border-t border-[var(--rule)] py-14">
        <div className="canvas flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-center text-sm text-[var(--muted)]">
          <button
            type="button"
            onClick={openConcierge}
            className="underline underline-offset-4 hover:text-[var(--foreground)]"
          >
            Request a private invitation
          </button>
          <Link href="/get-app" className="underline underline-offset-4 hover:text-[var(--foreground)]">
            Install the app
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--rule)] py-10 text-center text-sm text-[var(--muted)]">
        {/* Site-wide counterpart to the disclosure under the grid. The
            hero and the city tiles are all AI-generated illustration,
            and saying so once in the footer covers the surfaces that do
            not carry their own caption. */}
        <p className="canvas text-xs leading-relaxed">
          Photography on this page is AI-generated illustration and does not depict members.
        </p>
        <p className="mt-3">© 2026 {BRAND_CONFIG.masterBrand}.</p>
      </footer>

      <MaliConciergeModal open={conciergeOpen} onClose={() => setConciergeOpen(false)} />
    </main>
  );
}
