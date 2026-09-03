"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { RecaptchaVerifier, linkWithPhoneNumber, type ConfirmationResult, type User } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, db, signInWithGoogle, signOutUser, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import {
  DATING_INTENTION_OPTIONS,
  MIN_PROFILE_PHOTOS,
  PROMPT_QUESTIONS,
  REQUIRED_PROMPT_COUNT,
  type ProfilePrompt,
  type UserProfile,
} from "@/lib/types";
import { PhotoUploader, type PhotoSubmission } from "@/components/PhotoUploader";
import { WaitlistForm } from "@/components/WaitlistForm";
import { PushPrimer } from "@/components/PushPrimer";
import { VerifiedBadge } from "@/components/VerifiedBadge";

type Stage = "loading" | "signed-out" | "gender-gate" | "verify-phone" | "onboarding" | "editing" | "pending-review";

const GENDER_OPTIONS = ["woman", "man", "other"];

function calculateAge(birthdate: string): number {
  const dob = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

function emptyPrompts(): ProfilePrompt[] {
  return Array.from({ length: REQUIRED_PROMPT_COUNT }, () => ({
    id: crypto.randomUUID(),
    question: "",
    answer: "",
  }));
}

// Temporarily off: real testing evidence (auth/account-exists-with-
// different-credential surfaced by confirmVerificationCode's error
// message below) shows the phone gate rejects a number that's already
// verified on a different account — which repeated testing with one
// real number keeps triggering, blocking sign-up entirely. Flip back to
// true once that's live-verified as fixed. Every downstream stage
// already tolerates an empty phoneNumber (handleSubmit below,
// lib/types.ts), so this is safe to toggle either way.
const REQUIRE_PHONE_VERIFICATION = false;

// Direct product decision, not a permanent policy: registration opens to
// women first (a supply-side cold-start move — a dating app lives or
// dies on female profile density) while men get captured on the
// waitlist instead. Flip off once general registration opens; nothing
// downstream (data model, matching, pricing) is gender-conditional
// anywhere else, per lib/types.ts's own "no field encodes... " policy.
const WOMEN_ONLY_PRELAUNCH = true;

// Thin progress bar across the sign-up funnel (Hinge's pattern: a bare
// bar, no step count/percentage label). Built from the same feature
// flags above so it never drifts out of sync with which stages are
// actually reachable.
const FORM_STAGES: Stage[] = [
  ...(WOMEN_ONLY_PRELAUNCH ? (["gender-gate"] as const) : []),
  ...(REQUIRE_PHONE_VERIFICATION ? (["verify-phone"] as const) : []),
  "onboarding",
];

function OnboardingProgressBar({ stage }: { stage: Stage }) {
  const index = FORM_STAGES.indexOf(stage);
  if (index === -1) return null;
  const percent = ((index + 1) / FORM_STAGES.length) * 100;
  return (
    <div className="h-[3px] w-full bg-neutral-100">
      <div className="h-full bg-neutral-900 transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
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
  const [datingIntention, setDatingIntention] = useState("");
  const [prompts, setPrompts] = useState<ProfilePrompt[]>(emptyPrompts);
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(null);
  const [photoSubmissions, setPhotoSubmissions] = useState<PhotoSubmission[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [genderGateBlocked, setGenderGateBlocked] = useState(false);

  const [phoneInput, setPhoneInput] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const unsubscribeProfileRef = useRef<(() => void) | undefined>(undefined);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

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
      } else if (WOMEN_ONLY_PRELAUNCH) {
        // Ask before the phone step / full form, not after — no reason
        // to make someone fill anything in before finding out they
        // can't register yet.
        setStage("gender-gate");
      } else if (REQUIRE_PHONE_VERIFICATION && !nextUser.phoneNumber) {
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
      recaptchaVerifierRef.current?.clear();
    };
  }, []);

  function handleGenderGateContinue() {
    if (gender === "woman") {
      setStage(REQUIRE_PHONE_VERIFICATION && !user?.phoneNumber ? "verify-phone" : "onboarding");
    } else {
      setGenderGateBlocked(true);
    }
  }

  async function sendVerificationCode() {
    if (!user) return;
    setPhoneError(null);
    setPhoneSubmitting(true);
    try {
      // A fresh RecaptchaVerifier on every call (e.g. a retry after the
      // first attempt seemed to hang) renders a second widget into the
      // same container without clearing the first one — real symptom
      // seen: two separate reCAPTCHA bframe iframes in the Sources
      // panel at once, leading to a timeout and an orphaned
      // verification session the entered code could never match.
      recaptchaVerifierRef.current?.clear();
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      recaptchaVerifierRef.current = verifier;
      const result = await linkWithPhoneNumber(user, phoneInput.trim(), verifier);
      setConfirmationResult(result);
    } catch (err) {
      // Surfaced instead of swallowed — the previous generic message made
      // every failure mode (bad number, captcha/domain failure, quota,
      // phone-already-linked, network) look identical, which is why the
      // reCAPTCHA-reuse fix could look wrong or right with no way to tell.
      const code = err instanceof FirebaseError ? err.code : "unknown";
      console.error("sendVerificationCode failed:", err);
      setPhoneError(
        `Couldn't send a code to that number (${code}). Check it includes your country code (e.g. +66…).`,
      );
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
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "unknown";
      console.error("confirmVerificationCode failed:", err);
      // Real symptom seen in testing: this fires (not a code mismatch)
      // when the number is already verified on a different account —
      // e.g. the same real number reused across two Google sign-ins.
      setPhoneError(
        code === "auth/account-exists-with-different-credential" || code === "auth/credential-already-in-use"
          ? "That phone number is already verified on a different account. Sign in with that account instead, or use a different number."
          : `That code didn't match (${code}). Please try again.`,
      );
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
    setDatingIntention(existingProfile.datingIntention ?? "");
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
    if (!datingIntention) {
      setError("Let others know what you're looking for.");
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
      datingIntention,
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
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            {stage === "pending-review" && (
              <>
                <Link href="/browse" className="transition-colors hover:text-neutral-900">
                  Browse
                </Link>
                <Link href="/matches" className="transition-colors hover:text-neutral-900">
                  Matches
                </Link>
                <Link href="/liked-me" className="transition-colors hover:text-neutral-900">
                  Likes
                </Link>
                <Link href="/settings" className="transition-colors hover:text-neutral-900">
                  Settings
                </Link>
              </>
            )}
            <button onClick={() => signOutUser()} className="transition-colors hover:text-neutral-900">
              Sign out
            </button>
          </div>
        )}
      </header>

      <OnboardingProgressBar stage={stage} />

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

        {stage === "gender-gate" && (
          <div className="flex flex-col items-start gap-6 pt-8">
            {!genderGateBlocked ? (
              <>
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-medium tracking-tight">Quick question before we start</h1>
                  <p className="max-w-md text-neutral-500">
                    {BRAND_CONFIG.appTitle} is opening to women first, so we can build a real, verified community
                    before general launch.
                  </p>
                </div>
                <fieldset className="flex flex-col gap-1.5 text-sm">
                  <legend className="mb-0.5">I am a</legend>
                  <div className="flex flex-wrap gap-2">
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        type="button"
                        key={option}
                        onClick={() => setGender(option)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          gender === option
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-300 text-neutral-600"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <button
                  onClick={handleGenderGateContinue}
                  className="w-fit rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
                >
                  Continue
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-medium tracking-tight">Men&apos;s registration opens soon</h1>
                  <p className="max-w-md text-neutral-500">
                    We&apos;re focused on building a real, verified community of women first. Leave your email and
                    we&apos;ll let you know the moment it&apos;s your turn.
                  </p>
                </div>
                <WaitlistForm />
              </>
            )}
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

            <fieldset className="flex flex-col gap-1.5 text-sm">
              <legend className="mb-0.5">What are you looking for?</legend>
              <div className="flex flex-wrap gap-2">
                {DATING_INTENTION_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => setDatingIntention(option)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      datingIntention === option
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
              {existingProfile?.status !== "active" && (() => {
                // Reaching this screen already means phone verification +
                // profile info are done — the only real variable left is
                // photo progress, which this weights accordingly. A real
                // number, not a decorative one.
                const approvedCount = photoSubmissions.filter((s) => s.moderationStatus === "approved").length;
                const percent = Math.min(
                  100,
                  Math.round(66 + (34 * Math.min(approvedCount, MIN_PROFILE_PHOTOS)) / MIN_PROFILE_PHOTOS),
                );
                return (
                  <div className="flex w-full max-w-xs items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full bg-neutral-900 transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-xs text-neutral-400">{percent}%</span>
                  </div>
                );
              })()}
            </div>

            <PushPrimer user={user} alreadyEnabled={!!existingProfile?.fcmTokens?.length} />

            {existingProfile && (
              <div className="flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((v) => !v)}
                  className="w-fit text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                >
                  {previewOpen ? "Hide preview" : "Preview how others will see you"}
                </button>
                {previewOpen && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-5">
                    <div className="aspect-[4/5] w-full max-w-xs overflow-hidden rounded-xl bg-neutral-100">
                      {existingProfile.photos[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={existingProfile.photos[0].url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-medium">
                        {existingProfile.displayName || "Your name"}, {calculateAge(existingProfile.birthdate)}
                      </span>
                      <span className="text-sm text-neutral-400">{existingProfile.city}</span>
                      <VerifiedBadge
                        approvedPhotoCount={existingProfile.photos.length}
                        selfieVerified={existingProfile.selfieVerified}
                      />
                    </div>
                    {existingProfile.datingIntention && (
                      <span className="w-fit rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                        {existingProfile.datingIntention}
                      </span>
                    )}
                    {existingProfile.prompts?.[0]?.answer && (
                      <div className="rounded-xl border border-neutral-200 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                          {existingProfile.prompts[0].question}
                        </p>
                        <p className="mt-1 text-sm">{existingProfile.prompts[0].answer}</p>
                      </div>
                    )}
                    <p className="text-xs text-neutral-400">
                      This is exactly what other members see once your profile is live.
                    </p>
                  </div>
                )}
              </div>
            )}

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
