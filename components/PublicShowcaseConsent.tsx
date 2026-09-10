// /components/PublicShowcaseConsent.tsx
//
// Consent to appear on the public homepage.
//
// ---------------------------------------------------------------------
// Why this is a screen and not a checkbox.
//
// Everywhere else in this app, "visible" means visible to other signed-in
// members. firestore.rules enforces that deliberately — an active profile
// is not meant to be legible to anyone without an account. This toggle is
// the one thing that reverses it: it puts a woman's photograph, first
// name, age, city and occupation on the open internet, reachable by
// search engines, her employer, her family, and anyone she has ever
// blocked here.
//
// That is a materially different thing from what she agreed to at
// sign-up, so it gets asked for separately, in plain language, off by
// default, with no pre-ticked anything. Under GDPR consent has to be
// freely given, specific, informed and unambiguous, and a buried switch
// labelled "featured" satisfies none of those four.
//
// The preview is the most important part. Describing what gets published
// is worth less than showing it — a person can consent to a paragraph
// and still be surprised by the result, and being surprised by a
// photograph of yourself on a public dating homepage is exactly the
// harm this is meant to prevent. So the card rendered below is the same
// component the homepage uses, with her real data in it.
//
// Withdrawal is one tap, takes effect on the next revalidation (60s),
// and is stated up front rather than buried in the privacy policy.
// ---------------------------------------------------------------------

"use client";

import { useState } from "react";
import Image from "next/image";
import { doc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { calculateAge, type UserProfile } from "@/lib/types";

/** Exactly what /api/showcase publishes, and nothing else. Listed as
 *  data rather than prose so the copy cannot drift from the route. */
const PUBLISHED_FIELDS = [
  "Your first name only — never your full name",
  "Your age and city",
  "Your occupation, if you've added one",
  "Your first approved photo",
  "Whether you're verified, and how long your voice intro is",
];

const WITHHELD_FIELDS = [
  "Your bio, your other photos, and your voice recording itself",
  "Your phone number, email, and anything you've written in chat",
];

export function PublicShowcaseConsent({
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
  const [expanded, setExpanded] = useState(false);

  const on = profile.publicShowcase === true;
  // The homepage only publishes a profile with an approved photo, so
  // offering the switch without one would consent to nothing and look
  // broken when the card never appeared.
  const photo = profile.photos?.find((p) => p.moderationStatus === "approved");
  const eligible = Boolean(photo) && profile.status === "active";

  async function set(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "users", user.uid), { publicShowcase: next });
      onChange(next);
      if (next) setExpanded(false);
    } catch {
      setError("That couldn't be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--rule)] pb-8">
      <h2 className="text-sm font-medium text-[var(--foreground)]">Appear on the public homepage</h2>

      <p className="text-sm leading-relaxed text-[var(--muted)]">
        {on
          ? "Your card is on amoraasia.com, where anyone can see it — including people without an account."
          : "Off. Only signed-in members can see your profile."}
      </p>

      {!eligible && !on && (
        <p className="text-sm text-[var(--muted)]">
          {profile.status !== "active"
            ? "Available once your profile has been approved."
            : "Add a photo first — the homepage card needs one."}
        </p>
      )}

      {eligible && !on && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="btn-quiet w-fit px-5 py-2 text-sm"
        >
          See what this means
        </button>
      )}

      {/* The full disclosure, only when someone has asked for it — and
          the switch is not reachable until they have. */}
      {eligible && !on && expanded && (
        <div className="card mt-1 flex flex-col gap-5 p-5">
          <div>
            <p className="text-sm font-medium">This puts you on the open internet.</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              Not just to members — to anyone who visits amoraasia.com without signing in, and to
              search engines. Please think about whether your employer, your family, or anyone you
              would rather not hear from could find you this way.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="label text-[var(--gold-deep)]">What gets shown</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {PUBLISHED_FIELDS.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--gold)]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label text-[var(--muted)]">What stays private</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {WITHHELD_FIELDS.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--rule)]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The preview. Worth more than every line above it. */}
          {photo && (
            <div>
              <p className="label text-[var(--muted)]">Exactly how you would appear</p>
              <div className="card mt-2 w-40 overflow-hidden">
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
            </div>
          )}

          <p className="text-xs leading-relaxed text-[var(--muted)]">
            You can turn this off at any time and your card comes down within a minute. Turning it
            off does not affect your profile inside the app.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => set(true)}
              disabled={saving}
              className="btn-gold px-6 py-2.5 text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "I understand — show me on the homepage"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-sm text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {on && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => set(false)}
            disabled={saving}
            className="btn-quiet w-fit px-5 py-2 text-sm disabled:opacity-50"
          >
            {saving ? "…" : "Take me off the homepage"}
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]"
          >
            See the homepage
          </a>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Mali as the guardian of a privacy decision, which is the one
          onboarding role the audit actually reserves for her. */}
      {eligible && !on && expanded && (
        <div className="flex items-start gap-3">
          <Image
            src="/mascots/mali-seal.webp"
            alt=""
            aria-hidden
            width={48}
            height={72}
            className="h-auto w-10 shrink-0"
          />
          <p className="text-xs italic leading-relaxed text-[var(--muted)]">
            &ldquo;Take your time with this one. The women who join our founding cohort choose it
            themselves — and you can change your mind whenever you like.&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
