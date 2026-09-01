// /lib/moderation.ts
// Real content moderation — the actual mechanism behind "strict photo
// policy" and "no solicitation" as real, enforced rules rather than just
// stated ones. Country-agnostic on purpose: the text list below is
// generic commercial-solicitation language usable on a dating platform
// anywhere, not slang tied to any one country or region.
//
// Photo moderation uses Groq's vision model (qwen/qwen3.6-27b) as a
// classifier — the same vendor/model already proven in production for
// Ittsui's gesture-photo description feature (app/api/gestures/describe-
// photo/route.ts in that repo). Deliberately NOT Google Cloud Vision's
// SafeSearch API: Vision requires a Cloud Billing account (a card on
// file) even to stay within its free quota, where Groq's free tier needs
// none — verified directly against Groq's current docs (2026-09-01), not
// assumed, since their vision model lineup has changed names before.
//
// Honest-fallback posture throughout: a missing API key, a request
// failure, or a response that isn't EXACTLY one of the expected verdicts
// all fall to manual review — never "let it through". Silently approving
// unmoderated content because a key wasn't configured, or because the
// model hedged instead of giving a clean verdict, would be the one
// failure mode worse than moderation being briefly unavailable.
//
// Also rejects AI-generated/synthetic photos — a platform built on real
// profiles can't have people uploading a fabricated face. This is a
// genuinely harder classification than "is this racy" (AI-image
// detection is an imperfect problem even for dedicated tools), so it's
// held to the same honest-fallback standard: anything short of a clean,
// confident verdict goes to manual review rather than guessing.

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

// A photo only ever auto-clears when the model's response is an EXACT
// match for one of these four tokens — any hedging, extra text, or
// unexpected output falls to manual review rather than being guessed at.
export async function moderatePhoto(imageBase64: string): Promise<PhotoModerationResult> {
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
