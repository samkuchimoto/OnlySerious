"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { RecaptchaVerifier, linkWithPhoneNumber, type ConfirmationResult, type User } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, db, signInWithGoogle, signOutUser, watchAuthState } from "@/lib/firebase";
import { BRAND_CONFIG } from "@/config/brand";
import { COUNTRY_OPTIONS } from "@/lib/markets";
import {
  MAX_BIO_LENGTH,
  MAX_HEADLINE_LENGTH,
  MIN_PROFILE_PHOTOS,
  RELATIONSHIP_INTENTS,
  isRelationshipIntent,
  type RelationshipIntent,
  type UserProfile,
} from "@/lib/types";
import { PhotoUploader, type PhotoSubmission } from "@/components/PhotoUploader";
import { VoiceIntroRecorder } from "@/components/VoiceIntro";
import { FoundingSpotlight } from "@/components/FoundingSpotlight";
import { WaitlistForm } from "@/components/WaitlistForm";
import { PushPrimer } from "@/components/PushPrimer";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { InAppBrowserWarning } from "@/components/InAppBrowserWarning";
import { capture, identify, resetAnalytics } from "@/lib/analytics";

type Stage = "loading" | "signed-out" | "gender-gate" | "verify-phone" | "onboarding" | "editing" | "pending-review";

// Strictly binary, opposite-gender matching only, per direct product
// decision — man looking for woman and woman looking for man, nothing
// else. Shared by both the "I am a" and "Interested in" fields below.
const GENDER_OPTIONS = ["woman", "man"];

function calculateAge(birthdate: string): number {
  const dob = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
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

// Now off: general registration is open to everyone. It ran as a
// supply-side cold-start move (a dating app lives or dies on female
// profile density) with men captured on the waitlist instead, but men
// are the paying side — leaving this on meant the paid tier had no one
// who could reach it, and the marketing milestones are denominated in
// paying male subscribers. Flip back to true only to re-close
// registration; nothing downstream (data model, matching, pricing) is
// gender-conditional anywhere else, per lib/types.ts's own "no field
// encodes... " policy.
const WOMEN_ONLY_PRELAUNCH = false;

// Without this, nobody -- including whoever runs this app -- can create
// an account to browse and confirm women are actually showing up, since
// the gate above blocks every non-woman sign-up equally. A tiny, explicit
// allowlist rather than any real admin system: this is a stopgap for the
// prelaunch window, not a permanent feature.
const PRELAUNCH_GATE_ALLOWLIST = ["samuelclermont.contact@gmail.com", "samuel.r.louis@gmail.com"];

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
    <div className="h-[3px] w-full bg-[var(--rule)]">
      <div className="h-full bg-[var(--foreground)] transition-all" style={{ width: `${percent}%` }} />
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
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  // Intent Commitment. No default value on purpose — a pre-selected goal
  // is not a commitment, it is a value someone failed to notice.
  const [relationshipIntent, setRelationshipIntent] = useState<RelationshipIntent | "">("");
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
  // One-shot guard so profile_live is counted once per session, not once
  // per Firestore snapshot of an already-active profile.
  const profileLiveTrackedRef = useRef(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Live, not one-time — so an auto-activation triggered by a photo
  // upload (app/api/photos/route.ts) shows up here without a reload.
  function watchProfile(uid: string) {
    unsubscribeProfileRef.current?.();
    unsubscribeProfileRef.current = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (!snap.exists()) return;
        const next = snap.data() as UserProfile;
        setExistingProfile(next);
        // The top of the funnel that actually matters: a profile other
        // people can see. Fires when moderation flips the account to
        // active, which is why it's here and not after handleSubmit.
        // The ref guards against re-firing on every later snapshot
        // (a photo change, a pause) for an already-live profile.
        if (next.status === "active" && !profileLiveTrackedRef.current) {
          profileLiveTrackedRef.current = true;
          capture("profile_live", { gender: next.gender, photoCount: next.photos.length });
        }
      },
      (err) => {
        // A silent failure here would strand someone on "under review"
        // forever with no visible reason, even after their photos are
        // actually approved — see the messages listener fix for the same
        // failure class caught live earlier.
        console.error("profile listener failed:", err);
        setError("Couldn't load your profile status. Try refreshing the page.");
      },
    );
  }

  useEffect(() => {
    const unsubscribeAuth = watchAuthState(async (nextUser) => {
      setUser(nextUser);
      unsubscribeProfileRef.current?.();
      if (!nextUser) {
        setStage("signed-out");
        return;
      }
      // Ties every later event to one person instead of one browser
      // session — without it a returning user counts as a new one and
      // the top of every funnel is inflated.
      identify(nextUser.uid);

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
    const allowed = gender === "woman" || (!!user?.email && PRELAUNCH_GATE_ALLOWLIST.includes(user.email));
    if (allowed) {
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

  // Single-select — kept as a string[] in state/type for schema
  // compatibility, but only ever holds one value: opposite-gender-only
  // matching means there's exactly one real choice (see GENDER_OPTIONS).
  function selectInterestedIn(option: string) {
    setInterestedIn([option]);
  }

  function startEditing() {
    if (!existingProfile) return;
    setDisplayName(existingProfile.displayName);
    setBirthdate(existingProfile.birthdate);
    setGender(existingProfile.gender);
    setInterestedIn(existingProfile.interestedIn);
    setCity(existingProfile.city);
    setCountry(existingProfile.country);
    setHeadline(existingProfile.headline ?? "");
    setBio(existingProfile.bio ?? "");
    setRelationshipIntent(existingProfile.relationshipIntent ?? "");
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
    if (!headline.trim() || !bio.trim()) {
      setError("Add a headline and a short bio.");
      return;
    }
    // Checked here rather than only by disabling the button. The entire
    // promise of the product is that everyone in the grid has declared a
    // goal; a profile that reaches Firestore without one silently breaks
    // that promise for every person who later sees it.
    if (!isRelationshipIntent(relationshipIntent)) {
      setError("Choose what you're looking for — every profile here states its intent.");
      return;
    }

    const editableFields = {
      displayName: displayName.trim(),
      birthdate,
      gender,
      interestedIn,
      city: city.trim(),
      country: country.trim(),
      headline: headline.trim(),
      bio: bio.trim(),
      relationshipIntent,
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
        // The bottom of the form funnel. Gender rides along because
        // "how many men vs women finish the form" is the split that
        // decides whether the marketing spend is working.
        capture("profile_submitted", { gender: profile.gender });
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
    <main className="flex min-h-screen flex-col text-[var(--foreground)]">
      <header className="canvas flex flex-wrap items-center justify-between gap-y-2 py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        {/* Scrolls sideways instead of wrapping, matching
            components/AppNav — the wrapped version stranded "Sign out"
            alone on a second line on a phone. */}
        {user && (
          <div className="flex items-center gap-x-4 overflow-x-auto whitespace-nowrap text-sm text-[var(--muted)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stage === "pending-review" && (
              <>
                <Link href="/browse" className="shrink-0 transition-colors hover:text-[var(--foreground)]">
                  Browse
                </Link>
                <Link href="/matches" className="shrink-0 transition-colors hover:text-[var(--foreground)]">
                  Matches
                </Link>
                <Link href="/liked-me" className="shrink-0 transition-colors hover:text-[var(--foreground)]">
                  Likes
                </Link>
                <Link href="/settings" className="shrink-0 transition-colors hover:text-[var(--foreground)]">
                  Settings
                </Link>
                {/* Same Upgrade entry point as components/AppNav, inlined
                    because this page's header is stage-dependent (a
                    signed-out visitor and someone mid-form shouldn't see
                    it) and the subscription status is already loaded here
                    as existingProfile. */}
                {existingProfile && existingProfile.subscriptionStatus !== "active" && (
                  <Link
                    href="/premium"
                    onClick={() => capture("upgrade_clicked", { source: "nav:/sign-up" })}
                    className="btn-gold px-4 py-1.5 text-xs"
                  >
                    Upgrade
                  </Link>
                )}
              </>
            )}
            <button onClick={() => {
                resetAnalytics();
                signOutUser();
              }} className="shrink-0 transition-colors hover:text-[var(--foreground)]">
              Sign out
            </button>
          </div>
        )}
      </header>

      <OnboardingProgressBar stage={stage} />

      <section className="canvas measure flex-1 pb-20">
        {stage === "loading" && <p className="text-sm text-[var(--muted)]">Loading…</p>}

        {stage === "signed-out" && (
          <div className="flex flex-col items-start gap-6 pt-8">
            <InAppBrowserWarning />
            <h1 className="text-4xl font-medium leading-tight tracking-tight">Create your profile</h1>
            <p className="max-w-md text-[var(--muted)]">{BRAND_CONFIG.heroSubheadline}</p>
            <button
              onClick={() => {
                capture("signup_started");
                signInWithGoogle();
              }}
              className="btn-gold px-8 py-3.5 text-sm"
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
                  <p className="max-w-md text-[var(--muted)]">
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
                            ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--cream)]"
                            : "border-[var(--rule)] text-[var(--muted)]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <button
                  onClick={handleGenderGateContinue}
                  className="w-fit btn-gold px-8 py-3.5 text-sm"
                >
                  Continue
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-medium tracking-tight">Men&apos;s registration opens soon</h1>
                  <p className="max-w-md text-[var(--muted)]">
                    We&apos;re focused on building a real, verified community of women first. Leave your email and
                    we&apos;ll send you the link the moment OSThai launches on Google Play.
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
              <p className="max-w-md text-[var(--muted)]">
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
                    className="rounded-lg border border-[var(--rule)] px-4 py-2.5 focus:border-[var(--foreground)] focus:outline-none"
                  />
                </label>
                <p className="text-xs text-[var(--muted)]">Include your country code.</p>
                {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
                <button
                  onClick={sendVerificationCode}
                  disabled={phoneSubmitting || !phoneInput.trim()}
                  className="w-fit btn-gold px-8 py-3.5 text-sm disabled:opacity-50"
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
                    className="rounded-lg border border-[var(--rule)] px-4 py-2.5 focus:border-[var(--foreground)] focus:outline-none"
                  />
                </label>
                {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
                <button
                  onClick={confirmVerificationCode}
                  disabled={phoneSubmitting || !verificationCode.trim()}
                  className="w-fit btn-gold px-8 py-3.5 text-sm disabled:opacity-50"
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
                className="rounded-lg border border-[var(--rule)] px-4 py-2.5 focus:border-[var(--foreground)] focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              Date of birth
              <input
                required
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="rounded-lg border border-[var(--rule)] px-4 py-2.5 focus:border-[var(--foreground)] focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              I am a
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="rounded-lg border border-[var(--rule)] px-4 py-2.5 focus:border-[var(--foreground)] focus:outline-none"
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
                    onClick={() => selectInterestedIn(option)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      interestedIn.includes(option)
                        ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--cream)]"
                        : "border-[var(--rule)] text-[var(--muted)]"
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
                  className="rounded-lg border border-[var(--rule)] px-4 py-2.5 focus:border-[var(--foreground)] focus:outline-none"
                />
              </label>
              {/* A select, not free text. Country is now a primary
                  navigational control (the Country Hubs on Browse), and
                  a hub cannot filter on a field where "Thailand", "TH"
                  and "Bangkok, Thailand" are three different countries.
                  lib/markets still matches the old free-text spellings
                  so existing members are not stranded — this just stops
                  the problem growing. "Other" is offered because
                  refusing to let someone say where they actually live
                  is worse than a row the hubs cannot place. */}
              <label className="flex flex-1 flex-col gap-1.5 text-sm">
                Country
                <select
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="rounded-lg border border-[var(--rule)] bg-[var(--surface-solid)] px-4 py-2.5 focus:border-[var(--foreground)] focus:outline-none"
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {/* An existing profile may hold a spelling that is not
                      in the list; without this the select would silently
                      blank it and the next save would wipe their
                      country. */}
                  {country && !COUNTRY_OPTIONS.includes(country) && (
                    <option value={country}>{country}</option>
                  )}
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Intent Commitment. Three options, all of them serious —
                there is deliberately no "casual" or "not sure yet" here.
                That absence is the product: the competition's structural
                weakness is not that it has casual users, it is that it
                cannot tell which is which, so every serious woman on it
                is answering messages from people with a different goal.
                An app offering "not sure yet" has recreated that problem
                while claiming to have solved it. */}
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium">What are you looking for?</legend>
              <p className="-mt-1 text-xs text-[var(--muted)]">
                Everyone here answers this, and it shows on your profile. It is the reason this
                isn&apos;t like the other apps.
              </p>
              <div className="flex flex-col gap-2.5">
                {RELATIONSHIP_INTENTS.map((option) => {
                  const selected = relationshipIntent === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setRelationshipIntent(option.value)}
                      className={`rounded-[var(--radius)] border p-4 text-left transition-colors ${
                        selected
                          ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)]"
                          : "border-[var(--rule)] hover:border-[var(--gold)]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex flex-col gap-1.5 text-sm">
              Headline
              <input
                required
                maxLength={MAX_HEADLINE_LENGTH}
                placeholder="One line other members see first"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="rounded-lg border border-[var(--rule)] px-4 py-2.5 focus:border-[var(--foreground)] focus:outline-none"
              />
              {/* Without this, maxLength just stops accepting keystrokes with
                  nothing on screen to explain it — which is how a real profile
                  ended up published reading "...someone who has chil". Only
                  appears once you're close to the wall, so it's a warning
                  rather than permanent chrome. */}
              {headline.length >= MAX_HEADLINE_LENGTH - 20 && (
                <span
                  className={`text-xs ${
                    headline.length >= MAX_HEADLINE_LENGTH ? "text-red-600" : "text-[var(--muted)]"
                  }`}
                >
                  {headline.length >= MAX_HEADLINE_LENGTH
                    ? "Headline is full — trim it so it doesn't end mid-word."
                    : `${MAX_HEADLINE_LENGTH - headline.length} characters left`}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              Bio
              <textarea
                required
                rows={4}
                maxLength={MAX_BIO_LENGTH}
                placeholder="A bit about you and what you're looking for"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="rounded-lg border border-[var(--rule)] px-4 py-2.5 focus:border-[var(--foreground)] focus:outline-none"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="mt-2 flex items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn-gold px-8 py-3.5 text-sm disabled:opacity-50"
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
                  className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {stage === "pending-review" && user && (
          <div className="flex flex-col items-start gap-6 pt-8">
            {/* The mascot that stood beside this message is gone; the
                words do the work on their own. A screen that says "your
                profile is live" and then immediately asks for
                notifications reads as a system talking, so it says
                something human first — and on the review state, where
                the honest message is "wait", it says why the wait
                exists. */}
            <div className="flex items-center gap-4">
              <div>
                <p className="label text-[var(--gold-deep)]">
                  {existingProfile?.status === "active" ? "Welcome in" : "Almost there"}
                </p>
                <p className="mt-1 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
                  {existingProfile?.status === "active"
                    ? "You're one of the verified members people are actually looking for."
                    : "Every photo is checked by hand before it goes live. It's why the grid can be trusted."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="display text-3xl">
                  {existingProfile?.status === "active" ? "Your profile is live" : "Your profile is under review"}
                </h1>
                <button
                  onClick={startEditing}
                  className="text-sm text-[var(--muted)] underline-offset-2 transition-colors hover:text-[var(--foreground)] hover:underline"
                >
                  Edit profile
                </button>
              </div>
              <p className="max-w-md text-[var(--muted)]">
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
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--rule)]">
                      <div className="h-full bg-[var(--foreground)] transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-xs text-[var(--muted)]">{percent}%</span>
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
                  className="w-fit text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
                >
                  {previewOpen ? "Hide preview" : "Preview how others will see you"}
                </button>
                {previewOpen && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-[var(--rule)] p-5">
                    <div className="aspect-[4/5] w-full max-w-xs overflow-hidden rounded-xl bg-[var(--rule)]">
                      {existingProfile.photos[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={existingProfile.photos[0].url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-medium">
                        {existingProfile.displayName || "Your name"}, {calculateAge(existingProfile.birthdate)}
                      </span>
                      <span className="text-sm text-[var(--muted)]">{existingProfile.city}</span>
                      <VerifiedBadge
                        approvedPhotoCount={existingProfile.photos.length}
                        selfieVerified={existingProfile.selfieVerified}
                      />
                    </div>
                    {existingProfile.headline && <p className="text-base font-medium">{existingProfile.headline}</p>}
                    {existingProfile.bio && <p className="text-sm text-[var(--muted)]">{existingProfile.bio}</p>}
                    <p className="text-xs text-[var(--muted)]">
                      This is exactly what other members see once your profile is live.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-[var(--foreground)]">Photos</h2>
              <p className="text-sm text-[var(--muted)]">
                At least {MIN_PROFILE_PHOTOS} real photos are required — no AI-generated images.
              </p>
              <PhotoUploader user={user} onSubmissionsChange={setPhotoSubmissions} />
            </div>

            {/* Founding Spotlight — the public-homepage invitation.
                Placed after photos because it needs an approved one to
                preview, and before the voice recorder because it is the
                one step that decides whether she is ever seen by
                someone who has not joined yet. */}
            {existingProfile && (
              <FoundingSpotlight
                user={user}
                profile={existingProfile}
                onChange={(next) =>
                  setExistingProfile((prev) => (prev ? { ...prev, publicShowcase: next } : prev))
                }
              />
            )}

            {/* The voice introduction, after photos rather than before.
                It is the strongest single trust signal on a cross-border
                profile and it is also the most intimidating thing on
                this form — putting it ahead of the photo step would
                stall people at the point where they have invested least
                and are most likely to close the tab. */}
            <div className="border-t border-[var(--rule)] pt-6">
              <VoiceIntroRecorder
                user={user}
                existing={existingProfile?.voiceIntro}
                onChange={(intro) =>
                  setExistingProfile((prev) => (prev ? { ...prev, voiceIntro: intro } : prev))
                }
              />
            </div>

            {photoSubmissions.length >= MIN_PROFILE_PHOTOS && (
              <Link
                href="/browse"
                className="btn-gold px-8 py-3.5 text-sm"
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
