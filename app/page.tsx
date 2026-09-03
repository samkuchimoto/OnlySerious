import Image from "next/image";
import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";
import { WaitlistForm } from "@/components/WaitlistForm";

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
    title: "Zero tolerance for solicitation",
    body: "Commercial or transactional messages are flagged and reviewed — this isn't that kind of app.",
  },
];

// Visual language: white/black, Hinge-style minimalist ("feels like Mac
// minimalist" — direct instruction). Navigation UX for the actual browse/
// discovery screen (not built yet) follows ThaiFriendly's model instead —
// a filterable grid people search through, not a Tinder/Bumble swipe
// stack — a separate decision from this page's visual style.
export default function Home() {
  return (
    <main className="flex-1 bg-white text-neutral-900">
      <section className="relative flex min-h-[85vh] flex-col overflow-hidden">
        <Image src="/images/hero-couple.png" alt="" fill priority className="object-cover" />
        {/* Two stacked overlays: a mild wash across the whole photo so the
            nav stays legible without flattening the image, plus an extra
            bottom-weighted gradient concentrated where the headline sits. */}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
          <span className="text-lg font-semibold tracking-tight text-white">{BRAND_CONFIG.appTitle}</span>
          <Link
            href="/sign-up"
            className="rounded-full border border-white/70 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-neutral-900"
          >
            Get started
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-end px-6 pb-16 text-center sm:px-10 sm:pb-24">
          <h1 className="text-5xl font-medium leading-[1.05] tracking-tight text-white sm:text-7xl">
            {BRAND_CONFIG.heroHeadline}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/85 sm:text-xl">{BRAND_CONFIG.heroSubheadline}</p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/sign-up"
              className="rounded-full bg-white px-9 py-4 text-base font-medium text-neutral-900 transition-transform hover:scale-[1.02]"
            >
              Create your profile
            </Link>
            <p className="text-sm text-white/70">Free to join · {BRAND_CONFIG.tagline}</p>
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-100 px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <div key={item.title}>
              <p className="text-base font-medium">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{item.body}</p>
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
      <section className="border-t border-neutral-100 bg-neutral-50 px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">Get early access</h2>
          <p className="mt-3 text-sm text-neutral-500">
            Want OSThai the moment it&apos;s on Google Play? Leave your email and we&apos;ll send you the
            link.
          </p>
          <div className="mt-6">
            <WaitlistForm align="center" />
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-100 px-6 py-10 text-center text-sm text-neutral-400 sm:px-10">
        © 2026 {BRAND_CONFIG.masterBrand}.
      </footer>
    </main>
  );
}
