import Image from "next/image";
import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";
import { WaitlistForm } from "@/components/WaitlistForm";
import { InAppBrowserWarning } from "@/components/InAppBrowserWarning";
import { Mascot } from "@/components/Mascot";

// Real differentiators only — no feature listed here that isn't actually
// enforced in lib/moderation.ts. "Strict photo policy" and "no
// solicitation" are backed by real Vision SafeSearch checks and a real
// text filter, not just marketing copy.
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

// Visual language: the Sanctuary system — warm amber silk, dark teak,
// brass. Replaces the white/black minimalism, which was the correct
// choice for a Western product and the wrong one here: in a market whose
// incumbents are a 2005 desktop grid and a cold card stack, an unstyled
// white page reads as unfinished rather than as restrained, and
// unfinished is the one thing that reads as untrustworthy to the women
// this app has to earn first.
//
// Browse/discovery UX still follows ThaiFriendly's model — a filterable
// grid people search through, not a swipe stack — which is a separate
// decision from this page's visual style.
export default function Home() {
  return (
    <main className="flex-1">
      <div className="px-6 pt-4 sm:px-10">
        <InAppBrowserWarning />
      </div>

      {/* -----------------------------------------------------------------
          Asymmetrical hero. Copy occupies the left, the couple the right,
          and the two never overlap.

          The previous version centred the headline over the photograph,
          which put text across both faces — hiding the expressions that
          are the entire emotional argument, and making the type harder to
          read at the same time. It was also soft, because the source was
          a 1105px crop stretched to 2200. This is a 2560px WebP with no
          upscaling anywhere.
          ----------------------------------------------------------------- */}
      <section className="relative flex min-h-[86vh] flex-col overflow-hidden">
        {/* object-[70%] holds the couple in the right portion at every
            width. On a phone the frame crops toward them, which is the
            correct thing to lose the bay for; on desktop the bay and the
            railing become the quiet ground the copy sits on. */}
        <Image
          src="/images/hero-amora.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center]"
        />

        {/* Directional scrim. Left-to-right on desktop so the copy side
            darkens and the faces stay untouched; bottom-up on a phone,
            where the layout stacks and there is no left column. Teak-
            tinted rather than neutral black — grey over a golden-hour
            photograph drains it. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c130e]/85 via-[#1c130e]/25 to-transparent sm:bg-gradient-to-r sm:from-[#1c130e]/85 sm:via-[#1c130e]/40 sm:to-transparent" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
          <span className="display text-2xl text-white">{BRAND_CONFIG.appTitle}</span>
          <Link
            href="/sign-up"
            className="btn-quiet border-white/60 px-5 py-2 text-sm text-white hover:bg-white/10"
          >
            Get started
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-6 pb-16 sm:px-10 sm:pb-24">
          <div className="max-w-xl text-center sm:text-left">
            <h1 className="display text-5xl leading-[1.03] text-white sm:text-6xl lg:text-7xl">
              {BRAND_CONFIG.heroHeadline}
            </h1>
            <p className="mt-6 text-lg text-white/85 sm:text-xl">
              {BRAND_CONFIG.heroSubheadline}
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:items-start">
              <Link href="/sign-up" className="btn-gold px-9 py-4 text-base">
                Create your profile
              </Link>
              <p className="text-sm text-white/70">Free to join · {BRAND_CONFIG.tagline}</p>
            </div>
          </div>
        </div>

        {/* Amara, kept but moved out of the photograph's way. She sat over
            the man's arm before, which is what made her read as clutter
            against realistic imagery. Small, low, on the copy side, and
            desktop-only — a phone hero is already a face, a headline and
            a button, and a fourth element is one too many. */}
        <Mascot
          pose="heart"
          size="md"
          className="absolute bottom-0 left-2 z-0 hidden drop-shadow-2xl lg:block"
        />
      </section>

      <section className="border-t border-[var(--rule)] px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <div key={item.title}>
              <p className="display text-xl">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Universal email capture for the Google Play launch link —
          deliberately separate from the women-first registration gate
          (app/sign-up/page.tsx's WOMEN_ONLY_PRELAUNCH). That gate's
          explanation belongs on the sign-up screen where someone who's
          already tried to register and hit it needs to hear it; this
          section is a stranger's first touch, so it stays open and
          leads with the same real differentiators as the section above
          instead of a reason to wait. */}
      <section className="border-t border-[var(--rule)] bg-[color-mix(in_srgb,var(--gold)_7%,var(--background))] px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto max-w-xl">
          <div className="flex justify-center">
            <Mascot pose="sitting" size="lg" />
          </div>
          <div className="card-gold -mt-6 p-8 text-center sm:p-10">
            <h2 className="display text-2xl sm:text-3xl">Get early access</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Want {BRAND_CONFIG.appTitle} the moment it&apos;s on Google Play? Leave your email and
              we&apos;ll send you the link.
            </p>
            <div className="mt-6">
              <WaitlistForm align="center" />
            </div>

            {/* The waitlist above is for the Play listing, which doesn't
                exist yet. This is the app they can actually have right now —
                offered second so it doesn't compete with the email capture,
                but present, because asking someone to wait for something
                they could install in one tap is a needless loss. */}
            <div className="mt-8 border-t border-[var(--rule)] pt-6">
              <p className="text-sm text-[var(--muted)]">
                On your phone? You can install {BRAND_CONFIG.appTitle} now — no download, no store.
              </p>
              <Link
                href="/get-app"
                className="mt-3 inline-block text-sm font-semibold underline underline-offset-4 hover:text-[var(--terracotta)]"
              >
                Install the app
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--rule)] px-6 py-10 text-center text-sm text-[var(--muted)] sm:px-10">
        © 2026 {BRAND_CONFIG.masterBrand}.
      </footer>
    </main>
  );
}
