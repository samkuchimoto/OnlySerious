import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";

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
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
        <span className="text-lg font-semibold tracking-tight">{BRAND_CONFIG.appTitle}</span>
        <Link
          href="/sign-up"
          className="rounded-full border border-neutral-900 px-5 py-2 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white"
        >
          Get started
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center sm:px-10 sm:pt-24">
        <h1 className="text-5xl font-medium leading-[1.05] tracking-tight sm:text-7xl">
          {BRAND_CONFIG.heroHeadline}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-500 sm:text-xl">{BRAND_CONFIG.heroSubheadline}</p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-full bg-neutral-900 px-9 py-4 text-base font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Create your profile
          </Link>
          <p className="text-sm text-neutral-400">Free to join · {BRAND_CONFIG.tagline}</p>
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

      <footer className="border-t border-neutral-100 px-6 py-10 text-center text-sm text-neutral-400 sm:px-10">
        © 2026 {BRAND_CONFIG.masterBrand}.
      </footer>
    </main>
  );
}
