# Setting up Google Cloud Vision (stricter photo moderation)

Used by `lib/moderation.ts`'s `checkVisionSafeSearch()` — a second,
purpose-built check for racy/explicit content, layered on top of Groq's
own judgment (not a replacement — Groq stays required regardless, since
it's the only one of the two that can judge "is this AI-generated").

This needs a Cloud Billing account even for light usage, unlike Groq —
worth adding once Blaze billing is already active for another reason
(e.g. phone verification), not worth enabling billing for on its own.

## Steps

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
   and select the **`onlyserious-1db69`** project (a Firebase project
   *is* a Google Cloud project — no new project needed).
2. Open **APIs & Services → Library**, search for **Cloud Vision API**,
   click **Enable**.
3. Go to **APIs & Services → Credentials → + Create Credentials → API
   key**.
4. Open the new key's settings, under **API restrictions** choose
   **Restrict key** → **Cloud Vision API** only, so it's useless for
   anything else if it ever leaks.
5. Copy the key value.

## Adding it to the app

```
vercel env add GOOGLE_CLOUD_VISION_API_KEY production
vercel --prod
```

## Cost

Free tier covers the first 1,000 SafeSearch requests/month; pricing
beyond that is per-request — check the
[current Vision pricing page](https://cloud.google.com/vision/pricing)
before high-volume launch.
