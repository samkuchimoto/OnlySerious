// /components/DiscoveryGrid.tsx
//
// The browsing hook: hero, Mali's welcome, and the candidate grid whose
// every affordance opens the concierge modal instead of navigating.
//
// ---------------------------------------------------------------------
// The cards are real members, or they are not people at all.
//
// The brief asked for six to eight candidate cards with invented names,
// ages, cities and careers — "Ploi, 27 · Bangkok · Architect" — each
// carrying a Lotus Verified badge and a voice intro.
//
// That is a fabricated profile wearing a trust seal, on a dating site
// whose entire differentiator is that its profiles are real and its
// badges mean something. It is the artefact the audit describes the
// category being "plagued by", it is what the FTC pursued Match Group
// for, and it is unusually indefensible here because the badge would be
// asserting a verification that never happened for a person who does
// not exist.
//
// So the grid has exactly two modes:
//
//   Members    Real, active, verified people who have opted in to being
//              shown publicly (see /api/showcase for why consent is a
//              per-member flag and not a default). Every element the
//              brief specified renders: 4:5 face-framed portrait, name,
//              age, city, career, Lotus Verified, voice intro, garland.
//
//   Sanctuary  When nobody has opted in yet, the same grid renders the
//              cinematic scenes instead — the terrace, the rooftop, the
//              café — captioned as the settings they are. It keeps the
//              velvet-rope mechanic and the visual density completely
//              intact, and it does not claim any of them is a member.
//
// The second mode is what ships today, and the first turns on by itself
// the moment members opt in. Nothing needs rewriting in between.
// ---------------------------------------------------------------------

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EXAMPLE_PROFILES } from "@/lib/exampleProfiles";

interface ShowcaseMember {
  id: string;
  displayName: string;
  age: number;
  city: string;
  occupation: string | null;
  photoUrl: string | null;
  verified: boolean;
  voiceIntroSeconds: number | null;
}

function LotusVerified() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--gold)_55%,transparent)] bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--gold-deep)]"
      title="Selfie matched against an approved profile photo"
    >
      <Image src="/gifts/amber-lotus.webp" alt="" aria-hidden width={12} height={12} className="h-3 w-3 object-contain" />
      Lotus Verified
    </span>
  );
}

export function DiscoveryGrid({ onGate }: { onGate: () => void }) {
  const [members, setMembers] = useState<ShowcaseMember[]>([]);
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/showcase")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setMembers(Array.isArray(d.members) ? d.members : []);
        setCityCounts(d.cityCounts ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const showMembers = members.length > 0;
  const realMemberCount =
    (cityCounts.th ?? 0) + (cityCounts.ph ?? 0) + (cityCounts.vn ?? 0);

  return (
    <section className="canvas pb-16 pt-10 sm:pt-14">
      {/* ----- Hero ----- */}
      <div className="measure">
        <h1 className="display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
          Curated, Meaningful Connections Between the West and Asia.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-[var(--muted)]">
          A private, vetted sanctuary for verified professionals, cultured singles, and intentional
          cross-cultural love.
        </p>
      </div>

      {/* ----- Mali's welcome ----- */}
      <div className="mt-9 flex items-end gap-3 sm:gap-5">
        <Image
          src="/mascots/mali-wai.webp"
          alt=""
          aria-hidden
          width={130}
          height={195}
          priority
          className="h-auto w-24 shrink-0 sm:w-32"
        />
        {/* The tail is a rotated square tucked behind the bubble, so it
            inherits the same border and background and cannot drift out
            of alignment when the copy wraps. */}
        <div className="relative mb-6 max-w-md">
          <span
            aria-hidden
            className="absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-l border-[color-mix(in_srgb,var(--gold)_55%,var(--rule))] bg-[var(--surface-solid)]"
          />
          <div className="card-gold relative px-5 py-4">
            <p className="text-sm leading-relaxed">
              &ldquo;Sawasdee ka! Welcome to AmoraAsia. Let me introduce you to our private
              community.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Frames the grid before anyone reads a card. One of the four
          layers that keeps the example profiles honest — see
          lib/exampleProfiles.ts for the other three. */}
      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="label text-[var(--gold-deep)]">
          {showMembers ? "Members" : "How profiles appear · illustrative examples"}
        </p>
        {/* Only ever rendered with a number above zero. "0 real members
            already inside" is the single worst sentence this page could
            produce — it is the honest fallback turned into an
            advertisement against itself — and it is exactly what shows
            whenever the count cannot be read. */}
        {!showMembers && realMemberCount > 0 && (
          <p className="text-xs text-[var(--muted)]">
            {realMemberCount} real {realMemberCount === 1 ? "member" : "members"} already inside
          </p>
        )}
      </div>

      {/* ----- The grid -----
          Horizontal scroll on a phone, three columns from sm up, per the
          brief. snap-x makes the mobile scroller land on a card edge
          instead of stopping mid-portrait. */}
      <ul className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {showMembers
          ? members.map((member) => (
              <li key={member.id} className="w-[72vw] shrink-0 snap-start sm:w-auto">
                <div className="card lift group h-full overflow-hidden">
                  {/* The whole tile is the gate. A button rather than a
                      link because it must never navigate — that is the
                      velvet rope. */}
                  <button
                    type="button"
                    onClick={onGate}
                    aria-label={`${member.displayName}, ${member.age}, ${member.city} — apply for private access`}
                    className="block w-full text-left"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--rule)]">
                      {member.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.photoUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      )}
                    </div>
                  </button>

                  <div className="flex flex-col gap-2.5 p-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {member.displayName}, {member.age}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {member.city}
                        {member.occupation ? ` · ${member.occupation}` : ""}
                      </p>
                    </div>

                    {member.verified && <LotusVerified />}

                    {member.voiceIntroSeconds !== null && (
                      <button
                        type="button"
                        onClick={onGate}
                        className="btn-quiet w-full px-3 py-2 text-xs"
                      >
                        ▶ Listen to Voice Intro (0:
                        {String(member.voiceIntroSeconds).padStart(2, "0")})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onGate}
                      title="Send Jasmine Garland"
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--rule)] px-3 py-2 text-xs font-semibold transition-colors hover:border-[color-mix(in_srgb,var(--gold)_50%,var(--rule))]"
                    >
                      <Image
                        src="/gifts/jasmine-garland.webp"
                        alt=""
                        aria-hidden
                        width={16}
                        height={16}
                        className="h-4 w-4 object-contain"
                      />
                      Send Jasmine Garland
                    </button>
                  </div>
                </div>
              </li>
            ))
          : EXAMPLE_PROFILES.map((example) => (
              <li key={example.id} className="w-[72vw] shrink-0 snap-start sm:w-auto">
                <div className="card lift group h-full overflow-hidden">
                  <button
                    type="button"
                    onClick={onGate}
                    aria-label={`Example profile — ${example.name}, ${example.age}, ${example.city}. Apply for private access.`}
                    className="relative block w-full text-left"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--rule)]">
                      <Image
                        src={example.photo}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 72vw, 33vw"
                        className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                    {/* The chip that does the honest work. Always on the
                        card, never on hover, never behind a tooltip —
                        a disclosure a visitor has to discover is not a
                        disclosure. */}
                    <span className="label absolute left-2 top-2 rounded-full bg-[color-mix(in_srgb,var(--teak)_85%,transparent)] px-2 py-1 text-[0.5rem] text-[var(--gold)] backdrop-blur-sm">
                      Example
                    </span>
                  </button>

                  <div className="flex flex-col gap-2.5 p-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {example.name}, {example.age}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {example.city} · {example.occupation}
                      </p>
                    </div>

                    {/* Deliberately no Lotus Verified here. That badge
                        asserts a real selfie passed a real check, and
                        none of these did. It is the one card element
                        from the brief that cannot appear on an example. */}

                    <button type="button" onClick={onGate} className="btn-quiet w-full px-3 py-2 text-xs">
                      ▶ Listen to Voice Intro (0:{String(example.voiceSeconds).padStart(2, "0")})
                    </button>

                    <button
                      type="button"
                      onClick={onGate}
                      title="Send Jasmine Garland"
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--rule)] px-3 py-2 text-xs font-semibold transition-colors hover:border-[color-mix(in_srgb,var(--gold)_50%,var(--rule))]"
                    >
                      <Image
                        src="/gifts/jasmine-garland.webp"
                        alt=""
                        aria-hidden
                        width={16}
                        height={16}
                        className="h-4 w-4 object-contain"
                      />
                      Send Jasmine Garland
                    </button>
                  </div>
                </div>
              </li>
            ))}
      </ul>

      {!showMembers && (
        // Says plainly what the tiles are. Without it the grid implies
        // these are members, which is the whole thing being avoided.
        //
        // The AI disclosure is Samuel's call and it is the right one: it
        // is what makes illustrative imagery honest rather than merely
        // undeclared. It sits directly under the grid it describes,
        // because a disclosure in the footer is a disclosure nobody
        // reads next to the thing it is disclosing.
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          These are illustrative examples, not members. The portraits are AI-generated and the
          details are invented — real profiles are visible to approved members only.
        </p>
      )}

      {/* Both doors, side by side.
          The velvet rope is the primary path, but registration is
          genuinely open and someone ready to join now should not have to
          apply for permission to do a thing they can already do. Hiding
          the real signup behind a waitlist would lose exactly the
          high-intent visitor the page is written to attract. */}
      <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button type="button" onClick={onGate} className="btn-gold px-8 py-3.5 text-base">
          Apply for Private Invitation
        </button>
        <Link href="/sign-up" className="btn-quiet px-8 py-3.5 text-center text-base">
          Create your profile
        </Link>
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Applications take 60 seconds and are reviewed in weekly cohorts. Creating a profile is open
        now and free.
      </p>
    </section>
  );
}
