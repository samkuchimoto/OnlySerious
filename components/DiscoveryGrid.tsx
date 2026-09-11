// /components/DiscoveryGrid.tsx
//
// The guest teaser browse: real members, shown to logged-out visitors.
//
// A card is a photograph with a name and an age on it, and nothing else.
// City, occupation, the verified badge, the voice-intro button and the
// garland button have all been stripped out — the front page is there to
// show that real people are here, and every extra line was competing
// with the face for attention.
//
// Tapping anywhere opens the sign-up gate rather than navigating. That
// is the whole mechanic: browse freely, and the moment you want to do
// something, make an account.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface ShowcaseMember {
  id: string;
  displayName: string;
  age: number;
  photoUrl: string | null;
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

  const hasMembers = members.length > 0;

  return (
    <section id="directory" className="canvas scroll-mt-20 pb-14 pt-8">
      {/* Header and grid only when there are faces to show. The calls to
          action below always render: with the hero gone there is nothing
          else above the fold, so a failed fetch must not leave the page
          with no way into it. */}
      {hasMembers && (
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--celadon)] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--celadon)]" />
          </span>
          <p className="label text-[var(--gold-deep)]">Verified Founding Members</p>
        </div>
      )}

      <ul
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 ${
          hasMembers ? "mt-4" : "hidden"
        }`}
      >
        {members.map((member, i) => (
          <li key={member.id}>
            <button
              type="button"
              onClick={onGate}
              aria-label={`${member.displayName}, ${member.age}. Create a profile to see more.`}
              className="lift group block w-full overflow-hidden rounded-[var(--radius)] text-left"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--rule)]">
                {member.photoUrl && (
                  <Image
                    src={member.photoUrl}
                    alt=""
                    fill
                    priority={i < 4}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                )}
                {/* Name and age sit on the photograph, not in a band
                    under it — one element instead of two, and the card
                    reads as a portrait rather than a catalogue entry. */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--teak)]/90 via-[var(--teak)]/30 to-transparent p-3 pt-12">
                  <p className="text-sm font-semibold text-[var(--cream)]">
                    {member.displayName}, {member.age}
                  </p>
                </div>
              </div>
            </button>
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
    </section>
  );
}
