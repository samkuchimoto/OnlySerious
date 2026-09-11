// /components/HomeSections.tsx
//
// Sections 3, 4 and 5 of the homepage: what makes courtship here
// different, why it can be trusted, and the last invitation.
//
// ---------------------------------------------------------------------
// One rule governs every feature card below: it describes something
// that exists.
//
// The brief lists "Real-Time Neural Translation" alongside voice notes
// and gift tokens. Voice notes ship (app/api/voice-intro) and the gift
// tokens ship (lib/gifts). Translation does not exist anywhere in this
// codebase — not a stub, not a key, nothing. Advertising it on the
// homepage would be selling a feature the product cannot perform, to
// the precise audience whose main fear is being misled, and the first
// person to open a chat would discover it.
//
// So the third card is the Safe Connect Bridge, which is real, shipped,
// and solves a problem this audience actually has. Translation goes on
// the roadmap, and the card can be swapped the day it works.
// ---------------------------------------------------------------------

import Image from "next/image";
import Link from "next/link";

const COURTSHIP = [
  {
    title: "15-second voice notes",
    body: "Hear her actual voice and cadence before you ever meet. It is the one thing a fake profile cannot cheaply produce.",
    icon: "▶",
  },
  {
    title: "Traditional courtesies",
    body: "Send a hand-strung jasmine phuang malai or an amber lotus — gestures that mean something here, included with membership.",
    icon: "❁",
  },
  {
    title: "The Safe Connect Bridge",
    body: "Move to LINE or WhatsApp only when you both agree, after a real conversation. Consented, logged, and never one-sided.",
    icon: "⇄",
  },
];

const TRUST = [
  {
    title: "Verified intent",
    body: "Every member states marriage, a long-term relationship, or building a life together. There is deliberately no casual option to choose.",
  },
  {
    title: "A strict photo policy",
    body: "No shirtless, swimwear or underwear photos. Every upload is machine-checked before it is visible to anyone.",
  },
  {
    title: "Scam and bot shield",
    body: "Phone-linked accounts, selfie verification against an approved photo, and a solicitation filter on every message.",
  },
];

export function CourtshipSection() {
  return (
    <section className="canvas py-16 sm:py-20">
      <p className="label text-[var(--gold-deep)]">Inside the sanctuary</p>
      <h2 className="display mt-2 text-3xl sm:text-4xl">Courtship, not swiping.</h2>

      <ul className="mt-9 grid gap-5 sm:grid-cols-3">
        {COURTSHIP.map((item) => (
          <li key={item.title} className="card flex flex-col p-6">
            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-lg text-[var(--gold-deep)]"
            >
              {item.icon}
            </span>
            <p className="display mt-4 text-lg">{item.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrustSection() {
  return (
    <section className="border-y border-[var(--rule)] py-16 sm:py-20">
      <div className="canvas">
        <p className="label text-[var(--gold-deep)]">Why you can relax here</p>
        <h2 className="display mt-2 text-3xl sm:text-4xl">Three things we actually enforce.</h2>

        <ul className="mt-9 grid gap-5 sm:grid-cols-3">
          {TRUST.map((item) => (
            <li key={item.title} className="card-gold flex flex-col p-6">
              <p className="display text-lg">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-[var(--muted)]">
          Every claim on this page is enforced in code, not policy text. Read the{" "}
          <Link href="/safety" className="underline underline-offset-4 hover:text-[var(--foreground)]">
            safety guidelines
          </Link>{" "}
          for exactly how.
        </p>
      </div>
    </section>
  );
}

export function FinalInvitation() {
  return (
    <section className="canvas py-16 sm:py-24">
      <div className="card-gold relative overflow-hidden">
        <div className="grid items-center gap-8 p-8 sm:grid-cols-5 sm:p-12">
          {/* Mali with the Khom Loi lantern — the Lantern Matchmaker
              pose, which the brief reserves for exactly this moment. */}
          <div className="sm:col-span-2">
            <Image
              src="/mascots/mali-lantern.webp"
              alt=""
              aria-hidden
              width={360}
              height={540}
              className="mx-auto h-auto w-44 rounded-[var(--radius)] sm:w-full sm:max-w-[240px]"
            />
          </div>

          <div className="sm:col-span-3">
            <h2 className="display text-3xl leading-tight sm:text-4xl">
              Someone intentional is waiting for you.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
              Joining is free and takes about two minutes. Your profile is live as soon as your
              photos clear the automated check — there is no queue and no invitation to wait for.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className="btn-gold px-7 py-3.5 text-center text-base">
                Join Free as a Lady
              </Link>
              <Link href="/sign-up" className="btn-quiet px-7 py-3.5 text-center text-base">
                Create Gentleman Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[var(--teak)] py-14 text-[var(--cream)]">
      <div className="canvas">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/gifts/amber-lotus.webp"
                alt=""
                aria-hidden
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <span className="display text-xl">AmoraAsia</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--cream)]/65">
              Serious relationships across Southeast Asia. Verified profiles, stated intent, no
              casual option.
            </p>
          </div>

          <div>
            <p className="label text-[var(--gold)]">Where we are</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--cream)]/75">
              <li>Bangkok singles</li>
              <li>Cebu &amp; Metro Manila singles</li>
              <li>Da Nang &amp; Hanoi singles</li>
            </ul>
          </div>

          <div>
            <p className="label text-[var(--gold)]">Company</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {[
                ["Safety guidelines", "/safety"],
                ["Community guidelines", "/community-guidelines"],
                ["Privacy", "/privacy"],
                ["Terms", "/terms"],
                ["Get the app", "/get-app"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[var(--cream)]/75 underline-offset-4 transition-colors hover:text-[var(--cream)] hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The disclosure stays, and it stays here.
            It was removed from directly above the grid — as a line of
            small print immediately over eight faces it read as a
            catfishing warning, which is the opposite of its purpose.
            Deleting it outright is a different matter: illustrative
            portraits presented with no statement anywhere are simply
            undeclared, and "we never said they were real" is not a
            position worth defending. It disappears on its own the day
            real members fill the grid. */}
        <div className="mt-12 border-t border-[var(--cream)]/15 pt-6 text-xs leading-relaxed text-[var(--cream)]/50">
          <p>
            Sample profiles shown on this page are illustrative and use AI-generated imagery. Real
            member profiles are visible to signed-in members.
          </p>
          <p className="mt-2">© 2026 AmoraAsia.</p>
        </div>
      </div>
    </footer>
  );
}
