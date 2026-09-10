import Image from "next/image";
import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";
import { WaitlistForm } from "@/components/WaitlistForm";
import { InAppBrowserWarning } from "@/components/InAppBrowserWarning";
import { Lanterns } from "@/components/Lanterns";
import { MARKETS } from "@/lib/markets";

// Real differentiators only — no feature listed here that isn't actually
// enforced in lib/moderation.ts. "Strict photo policy" and the intent
// gate are backed by real Vision SafeSearch checks and a real required
// field, not just marketing copy.
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
    // Replaced a "zero tolerance for solicitation" claim. Two reasons.
    // It led with what the app forbids rather than what it is for, which
    // is a poor first impression in any market. And "transactional" is a
    // Western reading: across much of Southeast Asia, supporting a
    // partner's family is part of a serious commitment rather than a
    // transaction, so the word quietly insults half the people the app
    // exists to serve. The policy still lives in the Terms, where a
    // policy belongs.
    title: "Built for long-term, not for the weekend",
    body: "Everyone here chooses marriage, a long-term relationship, or building a life together. There is no casual option.",
  },
];

// ---------------------------------------------------------------------
// The marketing surface, rebuilt to the audit's brief.
//
// Two structural changes from what stood here:
//
//   No mascot, anywhere on this page. The audit's reasoning is
//   commercial: a stylised 3D character on a matchmaking homepage reads
//   to the mature Western subscriber as a mobile game, and in a
//   category defined by catfishing it primes him to doubt the entire
//   female registry. See components/Mali.tsx for where she went and why
//   she was kept rather than deleted.
//
//   Cinematic environmental photography instead. "The imagery across
//   these surfaces must instead feature authentic, cinematic
//   photography depicting real, mature couples in aspirational
//   settings: a quiet evening on a terrace overlooking the Chao Phraya
//   River... sophisticated couples sharing coffee in contemporary urban
//   environments like Bangkok, Cebu, or Da Nang." That is the hero, the
//   market strip and the closing band below, in that order.
// ---------------------------------------------------------------------
export default function Home() {
  return (
    <main className="flex-1">
      <div className="canvas pt-4">
        <InAppBrowserWarning />
      </div>

      {/* -----------------------------------------------------------------
          Asymmetrical hero. The couple hold the left, the copy the right,
          and the two never overlap.

          The layout follows the photograph rather than the other way
          round. This frame puts the couple in its left third and Wat
          Arun across the remaining two, so a copy column on the left —
          the conventional side — would sit directly on their faces, and
          object-position would have to crop toward the temple to avoid
          it, losing the people who are the entire emotional argument.
          Reversing the columns keeps both intact.
          ----------------------------------------------------------------- */}
      <section className="relative flex min-h-[86vh] flex-col overflow-hidden">
        {/* object-[22%] anchors the crop on the couple at every aspect
            ratio. On a phone, where the frame narrows to roughly a third
            of the image, that is the difference between a photograph of
            two people and a photograph of a river. */}
        <Image
          src="/images/hero-terrace.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[22%_center]"
        />

        {/* Directional scrim: right-to-left on desktop so the copy side
            darkens and the faces stay untouched, bottom-up on a phone
            where the layout stacks and there is no side column. Teak-
            tinted rather than neutral black — grey over a golden-hour
            photograph drains it. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--teak)]/88 via-[var(--teak)]/25 to-transparent sm:bg-gradient-to-l sm:from-[var(--teak)]/90 sm:via-[var(--teak)]/45 sm:to-transparent" />

        {/* The lantern drift. Sits above the scrim so the points read as
            light in the air rather than as dust on the lens. */}
        <Lanterns />

        <header className="canvas relative z-10 flex items-center justify-between py-8">
          <span className="display text-2xl text-[var(--cream)]">{BRAND_CONFIG.appTitle}</span>
          <Link
            href="/sign-up"
            className="btn-quiet border-[var(--cream)]/60 px-5 py-2 text-sm text-[var(--cream)] hover:bg-[var(--cream)]/10"
          >
            Get started
          </Link>
        </header>

        <div className="canvas relative z-10 flex flex-1 flex-col justify-end pb-16 sm:pb-24">
          {/* Right column from sm up; full width and centred on a phone,
              where the scrim runs bottom-up and there is no left half to
              stay clear of. */}
          <div className="text-center sm:ml-auto sm:max-w-lg sm:text-left lg:max-w-xl">
            <h1 className="display text-5xl leading-[1.03] text-[var(--cream)] sm:text-6xl lg:text-7xl">
              {BRAND_CONFIG.heroHeadline}
            </h1>
            <p className="mt-6 text-lg text-[var(--cream)]/85 sm:text-xl">
              {BRAND_CONFIG.heroSubheadline}
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:items-start">
              <Link href="/sign-up" className="btn-gold px-9 py-4 text-base">
                Create your profile
              </Link>
              <p className="text-sm text-[var(--cream)]/70">
                Free to join · {BRAND_CONFIG.tagline}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--rule)] py-20 sm:py-28">
        <div className="canvas grid gap-8 sm:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <div key={item.title}>
              <p className="display text-xl">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The Country Hubs, as a marketing surface.

          The audit elevates geography to a primary navigational control
          inside the app; showing the same three markets here is what
          makes the promise legible before sign-up. Each card is the same
          photograph the hub header uses, so the app does not look like a
          different product once you are inside it. */}
      <section className="border-t border-[var(--rule)] py-20 sm:py-28">
        <div className="canvas">
          <p className="label text-[var(--gold-deep)]">Where we are</p>
          <h2 className="display mt-2 text-3xl sm:text-4xl">Three countries, one standard</h2>
          <p className="measure mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Every member is verified the same way and held to the same rules, whichever country
            they joined from.
          </p>

          <ul className="mt-10 grid gap-5 sm:grid-cols-3">
            {MARKETS.map((market) => (
              <li key={market.id}>
                <div className="frame-teak lift group relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={market.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--teak)]/88 via-[var(--teak)]/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="display text-xl text-[var(--cream)]">{market.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--cream)]/75">
                      {market.cities.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Universal email capture for the Google Play launch link —
          deliberately separate from the women-first registration gate
          (app/sign-up/page.tsx's WOMEN_ONLY_PRELAUNCH). That gate's
          explanation belongs on the sign-up screen where someone who's
          already tried to register and hit it needs to hear it; this
          section is a stranger's first touch, so it stays open. */}
      <section className="relative overflow-hidden border-t border-[var(--rule)] py-20 sm:py-28">
        {/* Ambient backdrop rather than a flat tint — the brief's
            "cinematic environmental photography... as ambient backdrops
            and section transitions". Held right back so it is a room the
            card sits in, not a picture competing with it. */}
        <Image
          src="/scenes/sanctuary-interior.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-[0.18]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)] via-[var(--background)]/70 to-[var(--background)]" />

        <div className="canvas relative">
          <div className="mx-auto max-w-xl">
            <div className="card-gold p-8 text-center sm:p-10">
              <h2 className="display text-2xl sm:text-3xl">Get early access</h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Want {BRAND_CONFIG.appTitle} the moment it&apos;s on Google Play? Leave your email and
                we&apos;ll send you the link.
              </p>
              <div className="mt-6">
                <WaitlistForm align="center" />
              </div>

              {/* The waitlist above is for the Play listing, which
                  doesn't exist yet. This is the app they can actually
                  have right now — offered second so it doesn't compete
                  with the email capture, but present, because asking
                  someone to wait for something they could install in one
                  tap is a needless loss. */}
              <div className="mt-8 border-t border-[var(--rule)] pt-6">
                <p className="text-sm text-[var(--muted)]">
                  On your phone? You can install {BRAND_CONFIG.appTitle} now — no download, no store.
                </p>
                <Link
                  href="/get-app"
                  className="mt-3 inline-block text-sm font-semibold underline underline-offset-4 hover:text-[var(--gold-deep)]"
                >
                  Install the app
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--rule)] py-10 text-center text-sm text-[var(--muted)]">
        © 2026 {BRAND_CONFIG.masterBrand}.
      </footer>
    </main>
  );
}
