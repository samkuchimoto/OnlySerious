// /lib/moderation.ts
// Real content moderation — the actual mechanism behind "strict photo
// policy" and "no solicitation" as real, enforced rules rather than just
// stated ones. Country-agnostic on purpose: the text list below is
// generic commercial-solicitation language usable on a dating platform
// anywhere, not slang tied to any one country or region.
//
// Two vendors, two different jobs — not a fallback pair:
//   - Groq's vision model (qwen/qwen3.6-27b) is REQUIRED regardless of
//     Vision's availability, because it's the only one of the two that
//     can judge "is this photo AI-generated" — Google Cloud Vision's
//     SafeSearch has no equivalent category at all.
//   - Google Cloud Vision's SafeSearch, once GOOGLE_CLOUD_VISION_API_KEY
//     is set, runs as a stricter second opinion specifically for racy/
//     explicit content (its actual purpose-built job) on top of Groq's
//     own judgment on the same question — reject if either flags it,
//     approve only if both clear it. Skipped entirely while unconfigured
//     (e.g. before Blaze billing is enabled), in which case Groq's own
//     racy/explicit verdict is the only one there is.
//
// Honest-fallback posture throughout: a missing API key, a request
// failure, or a response that isn't EXACTLY one of the expected verdicts
// all fall to manual review — never "let it through". Silently approving
// unmoderated content because a key wasn't configured, or because the
// model hedged instead of giving a clean verdict, would be the one
// failure mode worse than moderation being briefly unavailable.

const MODERATION_TIMEOUT_MS = 8000;
const GROQ_VISION_MODEL = "qwen/qwen3.6-27b";

const MODERATION_PROMPT = `You are a strict content-moderation classifier for a serious dating app's profile photos.

Classify the photo using EXACTLY one of these four words, and nothing else — no explanation, no punctuation, no extra words:

APPROVE — a normal real photo appropriate for a dating profile (clothed, nothing explicit or suggestive, not AI-generated)
REJECT_RACY — swimwear, underwear, shirtless, or otherwise suggestive content
REJECT_EXPLICIT — nudity or sexually explicit content
REJECT_AI_GENERATED — the image appears to be AI-generated, synthetic, or a digital rendering rather than a real photograph

Respond with only one of those four exact words.`;

export interface PhotoModerationResult {
  status: "approved" | "rejected" | "needs_manual_review";
  reason?: string;
}

type Likelihood = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";
const REJECT_AT: Likelihood[] = ["LIKELY", "VERY_LIKELY"];

// Real, verified call against Vision's REST API (images:annotate,
// SAFE_SEARCH_DETECTION feature) — checked directly against Google's
// current docs before writing this, not guessed. "racy" is Google's own
// category for suggestive-but-not-explicit content (swimwear, underwear,
// shirtless), which is exactly the policy line this app draws stricter
// than most dating apps; "adult" covers explicit nudity/pornography.
async function checkVisionSafeSearch(imageBase64: string, apiKey: string): Promise<PhotoModerationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ image: { content: imageBase64 }, features: [{ type: "SAFE_SEARCH_DETECTION" }] }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`checkVisionSafeSearch: Vision API failed (${res.status}) ${body.slice(0, 300)}`);
      return { status: "needs_manual_review", reason: "Automatic moderation failed." };
    }
    const data = await res.json();
    const annotation = data?.responses?.[0]?.safeSearchAnnotation;
    if (!annotation) {
      console.error(`checkVisionSafeSearch: unexpected Vision response shape: ${JSON.stringify(data).slice(0, 300)}`);
      return { status: "needs_manual_review", reason: "Moderation response was ambiguous." };
    }
    if (REJECT_AT.includes(annotation.adult)) {
      return { status: "rejected", reason: "Explicit content detected." };
    }
    if (REJECT_AT.includes(annotation.racy)) {
      return {
        status: "rejected",
        reason: "This photo is too suggestive for this platform (swimwear, underwear, shirtless).",
      };
    }
    return { status: "approved" };
  } catch (err) {
    console.error("checkVisionSafeSearch: request threw", err);
    return { status: "needs_manual_review", reason: "Moderation timed out." };
  } finally {
    clearTimeout(timeout);
  }
}

// The only place a photo's real moderationStatus is decided. Groq always
// runs first (see file header for why); Vision, when configured, then
// gets the final say on racy/explicit content specifically — Groq's own
// "approved" on that dimension isn't enough once a stricter check is
// available to actually run.
export async function moderatePhoto(imageBase64: string): Promise<PhotoModerationResult> {
  const groqResult = await moderatePhotoWithGroq(imageBase64);
  if (groqResult.status !== "approved") return groqResult;

  const visionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!visionApiKey) return groqResult;

  return checkVisionSafeSearch(imageBase64, visionApiKey);
}

// A photo only ever auto-clears when the model's response is an EXACT
// match for one of these four tokens — any hedging, extra text, or
// unexpected output falls to manual review rather than being guessed at.
async function moderatePhotoWithGroq(imageBase64: string): Promise<PhotoModerationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { status: "needs_manual_review", reason: "Moderation isn't configured yet." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: MODERATION_PROMPT },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        max_tokens: 10,
        temperature: 0,
        // Without this, the model emits a <think>...</think> reasoning
        // block before its actual answer and a tight max_tokens cuts it
        // off mid-thought, before the real verdict ever appears —
        // verified against Groq's own docs (2026-09-01), not guessed.
        reasoning_effort: "none",
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`moderatePhoto: Groq vision failed (${res.status}) ${body.slice(0, 300)}`);
      return { status: "needs_manual_review", reason: "Automatic moderation failed." };
    }
    const data = await res.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    const verdict = typeof content === "string" ? content.trim().toUpperCase() : "";

    if (verdict === "APPROVE") return { status: "approved" };
    if (verdict === "REJECT_RACY") {
      return {
        status: "rejected",
        reason: "This photo is too suggestive for this platform (swimwear, underwear, shirtless).",
      };
    }
    if (verdict === "REJECT_EXPLICIT") {
      return { status: "rejected", reason: "Explicit content detected." };
    }
    if (verdict === "REJECT_AI_GENERATED") {
      return { status: "rejected", reason: "This photo looks AI-generated — only real photos are accepted." };
    }

    console.error(`moderatePhoto: unexpected Groq verdict: ${JSON.stringify(content).slice(0, 300)}`);
    return { status: "needs_manual_review", reason: "Moderation response was ambiguous." };
  } catch (err) {
    console.error("moderatePhoto: request threw", err);
    return { status: "needs_manual_review", reason: "Moderation timed out." };
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
