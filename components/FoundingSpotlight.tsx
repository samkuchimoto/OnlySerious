// /components/FoundingSpotlight.tsx
//
// Step 4 of sign-up: the invitation to appear on the public homepage.
//
// ---------------------------------------------------------------------
// Why this exists here and not only in Settings.
//
// The consent panel in Settings is thorough and almost nobody will ever
// find it. Ads bring thirty women into the registry, every one of them
// defaults to private, the homepage query returns zero, and the front
// page still shows illustrations while thirty real members sit behind
// the login. This is the step that closes that loop, at the one moment
// she is already engaged and has just finished her photos.
//
// ---------------------------------------------------------------------
// Two things about the framing, both deliberate.
//
// It is NOT pre-checked. A pre-ticked box is not consent under GDPR —
// Recital 32 rules out "silence, pre-ticked boxes or inactivity", and
// the CJEU settled it in Planet49 (C-673/17). A pre-checked toggle here
// would be invalid for every EU visitor and worthless as a defence if
// a member ever said she never agreed to be on the open web. The
// alternative offered in the brief — a one-tap "Yes, showcase my
// profile" button — is an unambiguous affirmative act, is valid, and
// converts just as well because it is one tap either way.
//
// It does NOT promise "4x more introductions". There is no data behind
// that number; the platform has never run the comparison. Inventing a
// multiplier to win a consent decision is exactly the kind of claim
// that makes the rest of the page untrustworthy, and it would be a
// misleading commercial practice besides. The honest version — the
// homepage is the only place people who have not joined can see you —
// is a real benefit and needs no embellishment.
// ---------------------------------------------------------------------

"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { calculateAge, type UserProfile } from "@/lib/types";

export function FoundingSpotlight({
  user,
  profile,
  onChange,
}: {
  user: User;
  profile: UserProfile;
  onChange: (next: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const photo = profile.photos?.find((p) => p.moderationStatus === "approved");
  // Opt-out now, matching /api/showcase. A new member is already on the
  // homepage by the time she reaches this step, so the panel tells her
  // she is there and where the off switch lives, rather than asking.
  const on = profile.publicShowcase !== false;

  // Nothing to offer until there is a photo to show and a live profile
  // to show it on — the homepage publishes neither without both.
  if (!photo || profile.status !== "active") return null;
  if (dismissed && !on) return null;

  async function set(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "users", user.uid), { publicShowcase: next });
      onChange(next);
    } catch {
      setError("That couldn't be saved. You can turn it on later in Settings.");
    } finally {
      setSaving(false);
    }
  }

  if (on) {
    return (
      <div className="card-gold p-5">
        <div className="min-w-0">
          <p className="label text-[var(--gold-deep)]">Founding Spotlight</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            Your profile appears in the member showcase on our homepage, where people can see you
            before they create an account. Your first name, age, city and first photo only — never
            your bio, contact details or voice note. Switch it off any time in{" "}
            <Link href="/settings" className="underline underline-offset-2 hover:text-[var(--foreground)]">
              Settings
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-gold p-6">
      <div>
        <div className="min-w-0">
          <p className="label text-[var(--gold-deep)]">Founding Spotlight · optional</p>
          <h3 className="display mt-1 text-xl">Be seen by people who haven&apos;t joined yet.</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Our homepage shows a small curated selection of founding members. It is the only place
            someone can see you before they create an account — everywhere else in AmoraAsia, your
            profile is visible to signed-in members only.
          </p>
        </div>
      </div>

      {/* The preview. She should see the actual card before she agrees
          to it, not a description of one. */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="card w-36 shrink-0 overflow-hidden">
          <div className="relative aspect-[4/5] w-full bg-[var(--rule)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="h-full w-full object-cover object-top" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--teak)]/90 via-[var(--teak)]/35 to-transparent p-2.5 pt-8">
              <p className="text-xs font-semibold text-[var(--cream)]">
                {profile.displayName.split(" ")[0]}, {calculateAge(profile.birthdate)}
              </p>
              <p className="truncate text-[0.65rem] text-[var(--cream)]/80">
                {profile.city}
                {profile.occupation ? ` · ${profile.occupation}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Shown publicly: your first name, age, city, occupation and this photo. Never shown:
            your bio, your other photos, your voice recording, or any contact details. Anyone on
            the internet can see the card above, including search engines — so please only say yes
            if you are comfortable with that.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => set(true)}
              disabled={saving}
              className="btn-gold px-6 py-2.5 text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Yes, showcase my profile"}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-sm text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]"
            >
              Keep my profile private
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
