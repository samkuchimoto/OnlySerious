# Setting up Google Cloud Vision (photo moderation)

Used by `lib/moderation.ts`'s `moderatePhoto()` — without this key, every
uploaded photo falls back to "pending" (manual review) instead of being
auto-approved. That's deliberate: a missing key never means content gets
approved unmoderated.

## Steps

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   select the **`onlyserious-1db69`** project in the project switcher at
   the top (this is the same project as Firebase — a Firebase project
   *is* a Google Cloud project, so you don't need a new one).
2. Open **APIs & Services → Library**, search for **Cloud Vision API**,
   and click **Enable**.
3. Go to **APIs & Services → Credentials → + Create Credentials → API
   key**.
4. Click into the new key and, under **API restrictions**, choose
   **Restrict key** → select **Cloud Vision API** only. This stops the
   key from being usable against any other Google API if it ever leaks.
5. Copy the key value.

## Adding it to the app

Paste the key value when asked, or run this yourself from the
`intently-web` directory:

```
vercel env add GOOGLE_CLOUD_VISION_API_KEY production
```

(paste the key when prompted, no quotes needed)

then redeploy:

```
vercel --prod
```

## Cost

The free tier covers the first 1,000 SafeSearch requests/month — plenty
for early testing. Pricing beyond that is per-request; check the
[current Vision pricing page](https://cloud.google.com/vision/pricing)
before high-volume launch.
