# Setting up Groq (photo moderation)

Used by `lib/moderation.ts`'s `moderatePhoto()` — a vision-capable model
classifies each uploaded photo. Without this key, every photo falls back
to "pending" (manual review) instead of being auto-approved. That's
deliberate: a missing key never means content gets approved unmoderated.

Chosen over Google Cloud Vision specifically because Groq's free tier
needs no Cloud Billing account (no card on file at all) — Vision
requires one even to stay within its free quota. This is the same
vendor/model already used in production for Ittsui's gesture-photo
description feature, so it's a proven pattern, not a new dependency.

## Steps

1. Go to [console.groq.com/keys](https://console.groq.com/keys) and sign
   up (email or Google sign-in — no payment method required).
2. Click **Create API Key**, name it (e.g. "onlyserious-moderation"),
   and copy the value — it's only shown once.

## Adding it to the app

Paste the key value when asked, or run this yourself from the
`intently-web` directory:

```
vercel env add GROQ_API_KEY production
```

(paste the key when prompted, no quotes needed)

then redeploy:

```
vercel --prod
```

## Limits

Groq's free tier has generous per-minute rate limits, more than enough
for early testing and a real early launch. Check
[console.groq.com/settings/limits](https://console.groq.com/settings/limits)
once signed in for the current numbers on your account.
