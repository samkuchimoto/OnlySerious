"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { RecaptchaVerifier, linkWithPhoneNumber, type ConfirmationResult, type User } from "firebase/auth";
import { auth, db, signInWithGoogle, signOutUser, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import { MIN_PROFILE_PHOTOS, PROMPT_QUESTIONS, REQUIRED_PROMPT_COUNT, type ProfilePrompt, type UserProfile } from "@/lib/types";
import { PhotoUploader, type PhotoSubmission } from "@/components/PhotoUploader";

type Stage = "loading" | "signed-out" | "verify-phone" | "onboarding" | "editing" | "pending-review";

const GENDER_OPTIONS = ["woman", "man", "other"];

function emptyPrompts(): ProfilePrompt[] {
  return Array.from({ length: REQUIRED_PROMPT_COUNT }, () => ({
    id: crypto.randomUUID(),
    question: "",
    answer: "",
  }));
}

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
  const [prompts, setPrompts] = useState<ProfilePrompt[]>(emptyPrompts);
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(null);
  const [photoSubmissions, setPhotoSubmissions] = useState<PhotoSubmission[]>([]);

  const [phoneInput, setPhoneInput] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const unsubscribeProfileRef = useRef<(() => void) | undefined>(undefined);

  // Live, not one-time — so an auto-activation triggered by a photo
  // upload (app/api/photos/route.ts) shows up here without a reload.
  function watchProfile(uid: string) {
    unsubscribeProfileRef.current?.();
    unsubscribeProfileRef.current = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) setExistingProfile(snap.data() as UserProfile);
    });
  }

  useEffect(() => {
    const unsubscribeAuth = watchAuthState(async (nextUser) => {
      setUser(nextUser);
      unsubscribeProfileRef.current?.();
      if (!nextUser) {
        setStage("signed-out");
        return;
      }
      const existing = await getDoc(doc(db, "users", nextUser.uid));
      if (existing.exists()) {
        setStage("pending-review");
        watchProfile(nextUser.uid);
      } else if (!nextUser.phoneNumber) {
        // Required of everyone equally — the low-friction traceability
        // signal every major dating app already uses (SMS OTP), instead
        // of collecting ID documents from anyone.
        setStage("verify-phone");
      } else {
        setStage("onboarding");
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfileRef.current?.();
    };
  }, []);

  async function sendVerificationCode() {
    if (!user) return;
    setPhoneError(null);
    setPhoneSubmitting(true);
    try {
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      const result = await linkWithPhoneNumber(user, phoneInput.trim(), verifier);
      setConfirmationResult(result);
    } catch {
      setPhoneError("Couldn't send a code to that number. Check it includes your country code (e.g. +66…).");
    } finally {
      setPhoneSubmitting(false);
    }
  }

  async function confirmVerificationCode() {
    if (!confirmationResult) return;
    setPhoneError(null);
    setPhoneSubmitting(true);
    try {
      await confirmationResult.confirm(verificationCode.trim());
      setStage("onboarding");
    } catch {
      setPhoneError("That code didn't match. Please try again.");
    } finally {
      setPhoneSubmitting(false);
    }
  }

  function toggleInterestedIn(option: string) {
    setInterestedIn((prev) =>
      prev.includes(option) ? prev.filter((value) => value !== option) : [...prev, option],
    );
  }

  function updatePrompt(index: number, field: "question" | "answer", value: string) {
    setPrompts((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function startEditing() {
    if (!existingProfile) return;
    setDisplayName(existingProfile.displayName);
    setBirthdate(existingProfile.birthdate);
    setGender(existingProfile.gender);
    setInterestedIn(existingProfile.interestedIn);
    setCity(existingProfile.city);
    setCountry(existingProfile.country);
    setPrompts(existingProfile.prompts?.length === REQUIRED_PROMPT_COUNT ? existingProfile.prompts : emptyPrompts());
    setError(null);
    setStage("editing");
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
    if (prompts.some((p) => !p.question || !p.answer.trim())) {
      setError("Pick a question and write an answer for all three prompts.");
      return;
    }
    if (new Set(prompts.map((p) => p.question)).size !== prompts.length) {
      setError("Choose a different question for each prompt.");
      return;
    }

    const editableFields = {
      displayName: displayName.trim(),
      birthdate,
      gender,
      interestedIn,
      city: city.trim(),
      country: country.trim(),
      prompts: prompts.map((p) => ({ ...p, answer: p.answer.trim() })),
    };

    setSubmitting(true);
    try {
      if (stage === "editing" && existingProfile) {
        // update(), not setDoc() — only touches these fields, so it can
        // never trip the Firestore rule guarding status/subscriptionStatus/
        // photos, which this payload doesn't even mention.
        await updateDoc(doc(db, "users", user.uid), editableFields);
        setExistingProfile({ ...existingProfile, ...editableFields });
      } else {
        const profile: UserProfile = {
          id: user.uid,
          ...editableFields,
          phoneNumber: user.phoneNumber ?? "",
          photos: [],
          status: "pending_review",
          createdAt: new Date().toISOString(),
          subscriptionStatus: "free",
        };
        await setDoc(doc(db, "users", user.uid), profile);
        setExistingProfile(profile);
        watchProfile(user.uid);
      }
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

        {stage === "verify-phone" && (
          <div className="flex flex-col items-start gap-6 pt-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-medium tracking-tight">Verify your phone number</h1>
              <p className="max-w-md text-neutral-500">
                Required for every profile — it&apos;s how we can trace an account back to a real person
                if something ever goes wrong, without collecting ID documents from anyone.
              </p>
            </div>

            {!confirmationResult ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  Phone number
                  <input
                    type="tel"
                    placeholder="+66 81 234 5678"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-4 py-2.5 focus:border-neutral-900 focus:outline-none"
                  />
                </label>
                <p className="text-xs text-neutral-400">Include your country code.</p>
                {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
                <button
                  onClick={sendVerificationCode}
                  disabled={phoneSubmitting || !phoneInput.trim()}
                  className="w-fit rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
                >
                  {phoneSubmitting ? "Sending…" : "Send code"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  Verification code
                  <input
                    type="text"
                    inputMode="numeric"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="rounded-lg border border-neutral-300 px-4 py-2.5 focus:border-neutral-900 focus:outline-none"
                  />
                </label>
                {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
                <button
                  onClick={confirmVerificationCode}
                  disabled={phoneSubmitting || !verificationCode.trim()}
                  className="w-fit rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
                >
                  {phoneSubmitting ? "Verifying…" : "Confirm code"}
                </button>
              </div>
            )}

            {/* Invisible reCAPTCHA anchor required by Firebase phone auth */}
            <div id="recaptcha-container" />
          </div>
        )}

        {(stage === "onboarding" || stage === "editing") && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-8">
            <h1 className="text-3xl font-medium tracking-tight">
              {stage === "editing" ? "Edit your profile" : "Tell us about you"}
            </h1>

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

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-0.5 text-sm">
                Pick {REQUIRED_PROMPT_COUNT} prompts and answer them — this is what shows on your profile
                instead of a plain bio.
              </legend>
              {prompts.map((prompt, index) => (
                <div key={prompt.id} className="flex flex-col gap-2 rounded-lg border border-neutral-300 p-4">
                  <select
                    required
                    value={prompt.question}
                    onChange={(e) => updatePrompt(index, "question", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="" disabled>
                      Choose a prompt…
                    </option>
                    {PROMPT_QUESTIONS.filter(
                      (q) => q === prompt.question || !prompts.some((p) => p.question === q),
                    ).map((question) => (
                      <option key={question} value={question}>
                        {question}
                      </option>
                    ))}
                  </select>
                  <textarea
                    required
                    rows={2}
                    placeholder="Your answer"
                    value={prompt.answer}
                    onChange={(e) => updatePrompt(index, "answer", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              ))}
            </fieldset>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="mt-2 flex items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {submitting ? "Saving…" : stage === "editing" ? "Save changes" : "Create profile"}
              </button>
              {stage === "editing" && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStage("pending-review");
                  }}
                  className="text-sm text-neutral-400 transition-colors hover:text-neutral-900"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {stage === "pending-review" && user && (
          <div className="flex flex-col items-start gap-6 pt-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-medium tracking-tight">
                  {existingProfile?.status === "active" ? "Your profile is live" : "Your profile is under review"}
                </h1>
                <button
                  onClick={startEditing}
                  className="text-sm text-neutral-400 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
                >
                  Edit profile
                </button>
              </div>
              <p className="max-w-md text-neutral-500">
                {existingProfile?.status === "active"
                  ? "Other members can now see your profile."
                  : `Live as soon as you have ${MIN_PROFILE_PHOTOS} approved photos.`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-neutral-700">Photos</h2>
              <p className="text-sm text-neutral-500">
                At least {MIN_PROFILE_PHOTOS} real photos are required — no AI-generated images.
              </p>
              <PhotoUploader user={user} onSubmissionsChange={setPhotoSubmissions} />
            </div>
            {photoSubmissions.length >= MIN_PROFILE_PHOTOS && (
              <Link
                href="/browse"
                className="rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
              >
                Continue to browse
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
