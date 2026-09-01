"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, signInWithGoogle, signOutUser, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import type { RelationshipIntent, UserProfile } from "@/lib/types";

type Stage = "loading" | "signed-out" | "onboarding" | "pending-review";

const GENDER_OPTIONS = ["woman", "man", "other"];
const INTENT_OPTIONS: { value: RelationshipIntent; label: string }[] = [
  { value: "long_term", label: "A long-term relationship" },
  { value: "not_sure", label: "Not sure yet" },
];

function isAtLeast18(birthdate: string): boolean {
  const dob = new Date(birthdate);
  if (Number.isNaN(dob.getTime())) return false;
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  return dob <= eighteenYearsAgo;
}

export default function SignUp() {
  const [stage, setStage] = useState<Stage>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState(GENDER_OPTIONS[0]);
  const [interestedIn, setInterestedIn] = useState<string[]>([GENDER_OPTIONS[0]]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [intent, setIntent] = useState<RelationshipIntent>("long_term");

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setStage("signed-out");
        return;
      }
      const existing = await getDoc(doc(db, "users", nextUser.uid));
      setStage(existing.exists() ? "pending-review" : "onboarding");
    });
  }, []);

  function toggleInterestedIn(option: string) {
    setInterestedIn((prev) =>
      prev.includes(option) ? prev.filter((value) => value !== option) : [...prev, option],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!user) return;
    if (!isAtLeast18(birthdate)) {
      setError("You must be 18 or older to join.");
      return;
    }
    if (interestedIn.length === 0) {
      setError("Select at least one option for who you're interested in.");
      return;
    }

    setSubmitting(true);
    try {
      const profile: UserProfile = {
        id: user.uid,
        displayName: displayName.trim(),
        birthdate,
        gender,
        interestedIn,
        city: city.trim(),
        country: country.trim(),
        bio: bio.trim(),
        intent,
        photos: [],
        status: "pending_review",
        createdAt: new Date().toISOString(),
        subscriptionStatus: "free",
      };
      await setDoc(doc(db, "users", user.uid), profile);
      setStage("pending-review");
    } catch {
      setError("Something went wrong saving your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        {user && (
          <button
            onClick={() => signOutUser()}
            className="text-sm text-neutral-400 transition-colors hover:text-neutral-900"
          >
            Sign out
          </button>
        )}
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-6 pb-20">
        {stage === "loading" && <p className="text-sm text-neutral-400">Loading…</p>}

        {stage === "signed-out" && (
          <div className="flex flex-col items-start gap-6 pt-8">
            <h1 className="text-4xl font-medium leading-tight tracking-tight">Create your profile</h1>
            <p className="max-w-md text-neutral-500">{BRAND_CONFIG.heroSubheadline}</p>
            <button
              onClick={() => signInWithGoogle()}
              className="rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            >
              Continue with Google
            </button>
          </div>
        )}

        {stage === "onboarding" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Tell us about you</h1>

            <label className="flex flex-col gap-1.5 text-sm">
              Name
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-lg border border-neutral-300 px-4 py-2.5 focus:border-neutral-900 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              Date of birth
              <input
                required
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="rounded-lg border border-neutral-300 px-4 py-2.5 focus:border-neutral-900 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              I am a
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="rounded-lg border border-neutral-300 px-4 py-2.5 focus:border-neutral-900 focus:outline-none"
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="mb-0.5">Interested in</legend>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => toggleInterestedIn(option)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      interestedIn.includes(option)
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300 text-neutral-600"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex gap-4">
              <label className="flex flex-1 flex-col gap-1.5 text-sm">
                City
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-4 py-2.5 focus:border-neutral-900 focus:outline-none"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-sm">
                Country
                <input
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-4 py-2.5 focus:border-neutral-900 focus:outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              Bio
              <textarea
                required
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="rounded-lg border border-neutral-300 px-4 py-2.5 focus:border-neutral-900 focus:outline-none"
              />
            </label>

            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="mb-0.5">What are you looking for?</legend>
              <div className="flex flex-col gap-2">
                {INTENT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="intent"
                      checked={intent === option.value}
                      onChange={() => setIntent(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Create profile"}
            </button>
          </form>
        )}

        {stage === "pending-review" && (
          <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">Your profile is under review</h1>
            <p className="max-w-md text-neutral-500">
              We check every new profile before it goes live — you&apos;ll be notified once yours is
              approved.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
