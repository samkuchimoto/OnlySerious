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

// The fallback. Places and moments, never invented people — each is a
// setting the community actually spans, captioned as such.
// `market` ties a tile to a launch market so it can show that market's
// real member count. The scenes without one are atmosphere for a city
// inside a market already represented above, so they carry no number
// rather than repeating one.
const SANCTUARY_SCENES: {
  src: string;
  place: string;
  note: string;
  market?: "th" | "ph" | "vn";
}[] = [
  { src: "/scenes/market-thailand.webp", place: "Bangkok", note: "Rooftop, Thong Lo", market: "th" },
  { src: "/scenes/market-philippines.webp", place: "Metro Manila", note: "Coffee in BGC", market: "ph" },
  { src: "/scenes/market-vietnam.webp", place: "Da Nang", note: "The bay at dusk", market: "vn" },
  { src: "/scenes/terrace-seated.webp", place: "Chao Phraya", note: "A terrace at golden hour" },
  { src: "/scenes/villa-breakfast.webp", place: "Chiang Mai", note: "Breakfast, unhurried" },
  { src: "/scenes/sanctuary-interior.webp", place: "Cebu", note: "Teak and quiet" },
];

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
          : SANCTUARY_SCENES.map((scene) => (
              <li key={scene.src} className="w-[72vw] shrink-0 snap-start sm:w-auto">
                <button
                  type="button"
                  onClick={onGate}
                  className="card lift group block h-full w-full overflow-hidden text-left"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--rule)]">
                    <Image
                      src={scene.src}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 72vw, 33vw"
                      className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--teak)]/85 via-[var(--teak)]/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="display text-lg text-[var(--cream)]">{scene.place}</p>
                      <p className="mt-0.5 text-xs text-[var(--cream)]/75">{scene.note}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-4">
                    <span className="text-xs text-[var(--muted)]">
                      {/* A real count, or "Opening soon" at zero.
                          Rendering a literal "0 members" is accurate and
                          reads as a dead market rather than an early
                          one — and it is the number a visitor sees
                          before the registry has had any chance to
                          fill. "Opening soon" is equally true of a
                          launch market with nobody in it yet, and it
                          still never claims a quantity that isn't
                          there. */}
                      {scene.market
                        ? (cityCounts[scene.market] ?? 0) > 0
                          ? `${cityCounts[scene.market]} ${
                              cityCounts[scene.market] === 1 ? "member" : "members"
                            }`
                          : "Opening soon"
                        : "Illustration"}
                    </span>
                    <span className="label text-[var(--gold-deep)]">Private</span>
                  </div>
                </button>
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
          Cities our members are in, with live member counts. Photography is AI-generated
          illustration, not members — real profiles are visible to approved members only.
        </p>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-4">
        <button type="button" onClick={onGate} className="btn-gold px-8 py-3.5 text-base">
          Apply for Private Invitation
        </button>
        <p className="text-sm text-[var(--muted)]">Takes 60 seconds. Reviewed in weekly cohorts.</p>
      </div>
    </section>
  );
}
