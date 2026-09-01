# Enabling Phone sign-in (required for phone verification)

Used by the sign-up flow's mandatory phone verification step
(`linkWithPhoneNumber` in `app/sign-up/page.tsx`) — the low-friction
traceability signal required of every account equally, instead of
collecting ID documents from anyone.

## Steps

1. Open [Authentication → Sign-in method](https://console.firebase.google.com/project/onlyserious-1db69/authentication/providers)
   in the Firebase console.
2. Click **Phone**, toggle **Enable**, click **Save**.

That's it — no API key needed. The invisible reCAPTCHA check that
protects this from abuse is built into the Firebase SDK already in the
code; `intently-web.vercel.app` is already in your Authorized domains
list from the Google sign-in setup, so no further domain configuration
is needed.

## Cost

Firebase's phone auth has a free tier (10,000 verifications/month at the
time of writing) before any charge applies — see
[Firebase Authentication pricing](https://firebase.google.com/pricing)
for current numbers.
