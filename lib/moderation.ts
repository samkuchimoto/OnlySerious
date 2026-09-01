// /lib/moderation.ts
// Real content moderation — the actual mechanism behind "strict photo
// policy" and "no solicitation" as real, enforced rules rather than just
// stated ones. Country-agnostic on purpose: the text list below is
// generic commercial-solicitation language usable on a dating platform
// anywhere, not slang tied to any one country or region.
//
// Photo moderation uses Google Cloud Vision's SafeSearch API — verified
// directly against Google's own current docs (2026-09-01) before writing
// this: real endpoint, real request/response shape, not guessed.
//
// Honest-fallback posture throughout: a missing API key never means "let
// it through" — it means the photo/message goes to manual human review
// instead. Silently approving unmoderated content because a key wasn't
// configured would be the one failure mode worse than moderation being
// briefly unavailable.

const SAFE_SEARCH_TIMEOUT_MS = 8000;

type Likelihood = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";

interface SafeSearchAnnotation {
  adult: Likelihood;
  racy: Likelihood;
  violence: Likelihood;
  medical: Likelihood;
  spoof: Likelihood;
}

export interface PhotoModerationResult {
  status: "approved" | "rejected" | "needs_manual_review";
  reason?: string;
}

const REJECT_AT: Likelihood[] = ["LIKELY", "VERY_LIKELY"];

// Real, verified call against Vision's REST API (images:annotate,
// SAFE_SEARCH_DETECTION feature) — see this file's header comment.
// "racy" is Google's own category for suggestive-but-not-explicit content
// (swimwear, underwear, shirtless), which is exactly the policy line this
// app draws stricter than most dating apps; "adult" covers explicit
// nudity/pornography, rejected regardless of this app's specific policy.
export async function moderatePhoto(imageBase64: string): Promise<PhotoModerationResult> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return { status: "needs_manual_review", reason: "moderation non configurée" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SAFE_SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "SAFE_SEARCH_DETECTION" }],
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`moderatePhoto: Vision API failed (${res.status}) ${body.slice(0, 300)}`);
      return { status: "needs_manual_review", reason: "échec de la modération automatique" };
    }
    const data = await res.json();
    const annotation: SafeSearchAnnotation | undefined = data?.responses?.[0]?.safeSearchAnnotation;
    if (!annotation) {
      console.error(`moderatePhoto: unexpected Vision response shape: ${JSON.stringify(data).slice(0, 300)}`);
      return { status: "needs_manual_review", reason: "réponse inattendue" };
    }

    if (REJECT_AT.includes(annotation.adult)) {
      return { status: "rejected", reason: "contenu explicite détecté" };
    }
    if (REJECT_AT.includes(annotation.racy)) {
      return { status: "rejected", reason: "photo trop suggestive pour cette plateforme (maillot de bain, sous-vêtements, torse nu)" };
    }
    return { status: "approved" };
  } catch (err) {
    console.error("moderatePhoto: request threw", err);
    return { status: "needs_manual_review", reason: "délai dépassé" };
  } finally {
    clearTimeout(timeout);
  }
}

// Generic, country-agnostic commercial-solicitation language — the same
// category of rule every mainstream dating app already enforces
// (Tinder/Bumble/Hinge all prohibit solicitation for commercial sexual
// services in their own terms of service). Deliberately NOT built around
// any one region's slang.
const SOLICITATION_TERMS = [
  "sugar daddy",
  "sugar baby",
  "pay you",
  "pay me",
  "cash gift",
  "allowance",
  "how much",
  "your rate",
  "escort",
  "outcall",
  "incall",
  "venmo me",
  "cashapp me",
  "sponsor me",
];

export interface TextModerationResult {
  flagged: boolean;
  matchedTerms: string[];
}

// A match holds the message for human review (Message.flagged), never an
// automatic ban — the same "narrate, don't auto-decide" principle applies
// here as it does for AI-assisted extraction elsewhere: false positives on
// real people are a worse failure mode than a human reviewer's delay.
export function moderateText(text: string): TextModerationResult {
  const lower = text.toLowerCase();
  const matchedTerms = SOLICITATION_TERMS.filter((term) => lower.includes(term));
  return { flagged: matchedTerms.length > 0, matchedTerms };
}
