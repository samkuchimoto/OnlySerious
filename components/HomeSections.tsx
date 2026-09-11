// /components/HomeSections.tsx
//
// What sits under the hero. Deliberately short: the previous version ran
// a three-card "courtship" section, a three-card trust section, a
// full-width invitation panel and a three-column footer, and the direct
// feedback was that the page is far too much text. A visitor deciding
// whether to join reads almost none of it.
//
// Three lines and a footer now.

import Link from "next/link";

/**
 * The title card. Sits above the member grid and does the job a hero
 * used to: say what this is, in one line, before anything else.
 *
 * It does not say "#1" or "top" anything. Those are ranking claims, and
 * a platform with four members making one is a misleading commercial
 * practice — the same exposure as an invented member count, and the
 * easiest kind of claim for a competitor or a regulator to test. What
 * it says instead is what the product actually is and what it refuses
 * to be, which is the real differentiator against the hookup apps this
 * audience is tired of.
 */
export function PageTitle() {
  // Sized and spaced to keep the member photographs above the fold on a
  // laptop. The subtitle that sat here cost three or four lines and
  // pushed the only thing that proves the platform is real below the
  // screen — the grid earns that space more than a sentence does.
  return (
    <section className="canvas pb-5 pt-10 text-center">
      <h1 className="display mx-auto mb-5 max-w-3xl text-[2.25rem] leading-[1.06] sm:text-[2.5rem]">
        Serious dating in Asia.
      </h1>
      <Link href="/sign-up" className="btn-gold btn-pulse inline-block px-10 py-3.5 text-base">
        Join Free
      </Link>
    </section>
  );
}

const TRUST = [
  ["Verified intent", "Marriage or long-term only. There is no casual option to pick."],
  ["Strict photos", "No shirtless, swimwear or underwear. Every upload is checked."],
  ["Scam shield", "Phone-linked accounts, selfie verification, filtered messages."],
];

export function TrustSection() {
  return (
    <section className="canvas py-14">
      <ul className="grid gap-5 sm:grid-cols-3">
        {TRUST.map(([title, body]) => (
          <li key={title}>
            <p className="display text-lg">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[var(--teak)] py-10 text-[var(--cream)]">
      <div className="canvas flex flex-col items-center gap-5 text-center">
        <Link href="/sign-up" className="btn-gold px-8 py-3.5 text-base">
          Join Free
        </Link>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[var(--cream)]/70">
          {[
            ["Safety", "/safety"],
            ["Guidelines", "/community-guidelines"],
            ["Privacy", "/privacy"],
            ["Terms", "/terms"],
            ["Get the app", "/get-app"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="underline-offset-4 hover:text-[var(--cream)] hover:underline">
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-[var(--cream)]/45">© 2026 AmoraAsia.</p>
      </div>
    </footer>
  );
}
