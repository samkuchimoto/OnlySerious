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
