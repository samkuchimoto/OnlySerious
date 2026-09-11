// /components/DiscoveryGrid.tsx
//
// The guest teaser browse: real members who have opted in to being
// shown publicly, and nothing else.
//
// The illustrative AI profiles that used to fill this grid are gone,
// along with the mascot. Thirty women were asked to register against
// that version and none did; three had registered against the plainer
// one that preceded it. A sample that small proves little on its own,
// but it is the only real evidence either way and it points one
// direction — so the illustrations went.
//
// With nobody opted in the whole section collapses to its two calls to
// action. That is deliberate: a pulsing live-presence header over an
// empty box is a worse signal than no directory at all, and there is
// now no filler to reach for. The only way this grid fills is real
// members granting consent in Settings.
// ---------------------------------------------------------------------

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

  // With nobody opted in there is no directory, and the section's own
  // calls to action are the same two buttons the hero already carries a
  // few hundred pixels above. Rendering it anyway produced the same
  // pair twice with an empty band between them, which reads as a
  // half-loaded page. The section returns the moment a member consents.
  if (!showMembers) return null;

  return (
    <section id="directory" className="canvas scroll-mt-20 pb-14">
      {/* The live-presence header belongs to a populated directory. With
          nobody showing it would be a pulsing green dot over an empty
          box, which is a worse signal than no directory at all. */}
      {showMembers && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--celadon)] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--celadon)]" />
            </span>
            <p className="label text-[var(--gold-deep)]">
              Verified Founding Members · Bangkok, Cebu &amp; Da Nang
            </p>
          </div>
        </div>
      )}

      {/* Denser than before: two columns on a phone, four on desktop.
          A dating app is a wall of faces, not a row of three. */}
      <ul
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 ${
          showMembers ? "mt-4" : "hidden"
        }`}
      >
        {members.map((member, i) => (
          <li key={member.id}>
            <ProfileCard
              name={member.displayName}
              age={member.age}
              city={member.city}
              occupation={member.occupation}
              // A member without a photo never reaches this list —
              // /api/showcase requires an approved one — so there is
              // nothing to fall back to, and nothing that could
              // accidentally put a stock image under a real name.
              photo={member.photoUrl as string}
              voiceSeconds={member.voiceIntroSeconds}
              verified={member.verified}
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
