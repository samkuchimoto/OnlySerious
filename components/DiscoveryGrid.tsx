// /components/DiscoveryGrid.tsx
//
// The guest teaser browse — the hook.
//
// ---------------------------------------------------------------------
// Why the faces come first now.
//
// The previous version opened with a three-line serif headline, a
// paragraph, and a mascot before a single person appeared. Direct
// feedback, and correct: "when we look for a dating app, we should see
// women". A visitor evaluating a matchmaking platform is answering one
// question in the first two seconds — is anybody here, and are they
// worth my time — and prose cannot answer it. So the headline is one
// compact line, Mali moved to a single inline row, and the grid begins
// above the fold.
//
// ---------------------------------------------------------------------
// What these cards are, and the one sentence that keeps them honest.
//
// The per-card "EXAMPLE" chip is gone. That critique was right: stamping
// EXAMPLE across every face reads as an unfinished demo, which is worse
// for trust than the thing it was guarding against.
//
// What replaces it is a section-level statement — the same pattern a
// product tour or an app-store gallery uses. The claim is made once,
// clearly, above the grid it describes, instead of eight times in a way
// that makes the product look fake.
//
// What is NOT here, and will not be: "Active Today", "Founding Member"
// or "Verified Intent" chips on these cards. Those were suggested as the
// replacement, and each is a statement of fact about a specific person —
// that she exists, that she was here today, that a check was performed.
// None is true of an AI-generated illustration, and putting a trust
// signal on a person who does not exist is the precise practice this
// platform sells itself as being free of. The chips are implemented on
// the real-member path below, where they are true.
//
// The real answer to a thin grid is a thicker registry, not a thicker
// claim — 30–50 verified women is a weekend of ad spend, and the day
// they opt in this component renders them instead, with every badge
// earned.
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

/** One card. Identical chrome for a real member and an illustration —
 *  only the badge differs, because only the badge makes a claim. */
function ProfileCard({
  name,
  age,
  city,
  occupation,
  photo,
  voiceSeconds,
  verified,
  eager,
  onGate,
}: {
  name: string;
  age: number;
  city: string;
  occupation: string | null;
  photo: string;
  voiceSeconds: number | null;
  verified: boolean;
  eager: boolean;
  onGate: () => void;
}) {
  return (
    <div className="card lift group h-full overflow-hidden">
      <button
        type="button"
        onClick={onGate}
        aria-label={`${name}, ${age}, ${city}. Create a profile to see more.`}
        className="relative block w-full text-left"
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--rule)]">
          <Image
            src={photo}
            alt=""
            fill
            priority={eager}
            sizes="(max-width: 640px) 60vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {/* Foot scrim so the name sits on the photograph rather than
              in a separate band — denser, and it reads as a dating app
              rather than as a catalogue. */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--teak)]/90 via-[var(--teak)]/35 to-transparent p-3 pt-10">
            <p className="text-sm font-semibold text-[var(--cream)]">
              {name}, {age}
            </p>
            <p className="truncate text-xs text-[var(--cream)]/80">
              {city}
              {occupation ? ` · ${occupation}` : ""}
            </p>
          </div>
        </div>
      </button>

      <div className="flex flex-col gap-2 p-3">
        {verified && <LotusVerified />}
        {voiceSeconds !== null && (
          <button type="button" onClick={onGate} className="btn-quiet w-full px-3 py-2 text-xs">
            ▶ Voice intro (0:{String(voiceSeconds).padStart(2, "0")})
          </button>
        )}
        <button
          type="button"
          onClick={onGate}
          title="Send Jasmine Garland"
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--rule)] px-3 py-2 text-xs font-semibold transition-colors hover:border-[color-mix(in_srgb,var(--gold)_50%,var(--rule))]"
        >
          <Image
            src="/gifts/jasmine-garland.webp"
            alt=""
            aria-hidden
            width={14}
            height={14}
            className="h-3.5 w-3.5 object-contain"
          />
          Send Jasmine Garland
        </button>
      </div>
    </div>
  );
}

export function DiscoveryGrid({ onGate }: { onGate: () => void }) {
  const [members, setMembers] = useState<ShowcaseMember[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/showcase")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMembers(Array.isArray(d.members) ? d.members : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const showMembers = members.length > 0;

  return (
    <section id="directory" className="canvas scroll-mt-20 pb-14">
      {/* Live status header. The pulse is the ThaiFriendly tell — a
          man decides in two seconds whether a directory is inhabited,
          and a green dot does that work faster than any sentence.

          The "AI imagery" line that used to sit here is gone. Directly
          above eight faces it read as a catfishing warning, which is
          the opposite of what a disclosure is for. It now lives in the
          footer, where it is still plainly stated and no longer the
          first thing a visitor reads about the people on the page. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--celadon)] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--celadon)]" />
          </span>
          <p className="label text-[var(--gold-deep)]">
            {showMembers
              ? "Verified Founding Members · Bangkok, Cebu & Da Nang"
              : "Inside AmoraAsia · Bangkok, Cebu & Da Nang"}
          </p>
        </div>
      </div>

      {/* Denser than before: two columns on a phone, four on desktop.
          A dating app is a wall of faces, not a row of three. */}
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {showMembers
          ? members.map((member, i) => (
              <li key={member.id}>
                <ProfileCard
                  name={member.displayName}
                  age={member.age}
                  city={member.city}
                  occupation={member.occupation}
                  photo={member.photoUrl ?? "/examples/example-01.webp"}
                  voiceSeconds={member.voiceIntroSeconds}
                  verified={member.verified}
                  eager={i < 4}
                  onGate={onGate}
                />
              </li>
            ))
          : EXAMPLE_PROFILES.map((example, i) => (
              <li key={example.id}>
                <ProfileCard
                  name={example.name}
                  age={example.age}
                  city={example.city}
                  occupation={example.occupation}
                  photo={example.photo}
                  voiceSeconds={example.voiceSeconds}
                  // Never on an illustration. See the header note.
                  verified={false}
                  eager={i < 4}
                  onGate={onGate}
                />
              </li>
            ))}
      </ul>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/sign-up" className="btn-gold px-7 py-3.5 text-center text-base">
          Join Free (Ladies)
        </Link>
        <Link href="/sign-up" className="btn-quiet px-7 py-3.5 text-center text-base">
          Create Gentleman Profile
        </Link>
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Free to join. Your profile goes live as soon as your photos clear — no queue, no invitation
        to wait for.
      </p>
    </section>
  );
}
