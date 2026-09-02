# Setting up push notifications (Firebase Cloud Messaging)

Used by `lib/messaging.ts` / `components/NotificationSettings.tsx` — a
member can opt in to get notified when someone likes them, matches with
them, or sends a message. Free, no Cloud Billing account needed (unlike
Vision/Storage — FCM has never required one).

## Steps

1. Open [Project Settings → Cloud Messaging](https://console.firebase.google.com/project/onlyserious-1db69/settings/cloudmessaging)
   in the Firebase console.
2. Scroll to **Web configuration** → **Web Push certificates**.
3. Click **Generate key pair**.
4. Copy the key shown (starts with a long string of letters/numbers).

## Adding it to the app

```
vercel env add NEXT_PUBLIC_FIREBASE_VAPID_KEY production
vercel --prod
```

Note this one is `NEXT_PUBLIC_` — it's meant to be public, not a secret,
same as the other Firebase client config values.

## What happens without it

Nothing breaks — `enablePushNotifications()` just returns a clear
"push notifications aren't configured yet" message instead of silently
pretending it worked, and the rest of the app (likes, matches,
messaging) works exactly the same either way.
