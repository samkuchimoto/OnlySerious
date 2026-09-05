# Shipping OSThai on Google Play

## Why a TWA and not Flutter / React Native

A **Trusted Web Activity** is a real Android app, shipped through Play,
that renders this site full-screen with no browser UI. Google built it
for exactly this case.

The alternative — rewriting in Flutter or React Native — means
reimplementing Google auth, Firestore reads and listeners, photo upload
and moderation, selfie verification, Stripe billing, the like limits,
messaging and the cooldown. All of it already works here. That is months
of work to arrive back where you started, plus two codebases to keep in
sync forever.

Concrete consequences of the TWA choice:

- **Updates ship instantly.** The app's content *is* the website, so a
  Vercel deploy updates every installed app with no Play review. A
  Flutter build means a new release and a review queue for every fix.
- **Push already works.** FCM web push runs inside the TWA — the same
  notifications the site sends today.
- **One bug surface.** A fix on the web is a fix in the app.

The real trade-off: a TWA cannot use native-only APIs (background
location, native in-app purchases, deep OS integration). Nothing OSThai
does needs them. Camera and photo upload work through the standard web
file input, which is what the site already uses.

> **Play billing note.** Google requires Play Billing for digital goods
> in some categories, and dating apps are a common exception where
> external payment is permitted — but the policy varies by country and
> changes. Stripe Checkout inside a TWA is the current setup. Check
> Play's payments policy for Thailand before launch; if Play Billing is
> required, that is the one thing that would force a native shell.

## What's already done

The web side is complete and deployed:

- `app/manifest.ts` — installable manifest, `display: standalone`,
  `start_url: /browse`, theme colour, shortcuts
- `public/icons/` — 192, 512 and a maskable 512 with a wider safe zone
- `public/firebase-messaging-sw.js` — service worker now registered on
  every page load (not only on notification opt-in), with an offline
  fallback and notification click-through
- `app/api/assetlinks/route.ts` + rewrite — serves
  `/.well-known/assetlinks.json`, driven by env vars

**The site is already installable.** On Android Chrome, "Add to home
screen" gives a standalone app with the right icon and push
notifications today, without Play. That covers most of the retention
argument while the Play listing is prepared.

## Building the Play Store package

`twa-manifest.json` in the repo root is Bubblewrap's input, already
filled in — so the interactive `init` below can be skipped if the
toolchain is in place. Run `npx @bubblewrap/cli build` from the repo
root instead.

> **Bubblewrap's own JDK installer doesn't work non-interactively on
> Windows.** It prompts, and if stdin isn't a real terminal it downloads
> only the JDK *sources* and exits — leaving `~/.bubblewrap/config.json`
> with empty paths and no `java.exe` anywhere. Symptom: 170MB+ in
> `~/.bubblewrap/jdk` and still "no JDK found". Install a JDK yourself
> (Temurin 17) and point Bubblewrap at it rather than fighting the
> prompt.

### 1. Generate the project

```bash
npx @bubblewrap/cli init --manifest=https://intently-web.vercel.app/manifest.webmanifest
```

Accept the defaults except:

| Prompt | Answer |
| --- | --- |
| Application ID | `app.osthai.twa` — **permanent**, it can never be changed after the first Play upload |
| Start URL | `/browse` |
| Display mode | `standalone` |
| Status bar colour | `#171717` |
| Include support for Play Billing | **No** (Stripe Checkout is used) |
| Signing key | Let it create `android.keystore` |

**Write down the keystore password.** Losing it means you can never
update the app under the same listing.

### 2. Build

```bash
npx @bubblewrap/cli build
```

Produces `app-release-bundle.aab` — the file Play accepts.

### 3. Wire up Digital Asset Links

Bubblewrap prints the SHA-256 fingerprint of your signing key. Add it in
Vercel:

```
ANDROID_PACKAGE_NAME=app.osthai.twa
ANDROID_CERT_FINGERPRINTS=AA:BB:CC:...
```

Redeploy, then confirm:

```
https://intently-web.vercel.app/.well-known/assetlinks.json
```

**After the first Play upload, come back and add a second fingerprint.**
Google Play App Signing re-signs the app with *its own* key, so the
fingerprint Android checks in production is not your local one. Get it
from Play Console → **Release → Setup → App signing**, and append it to
`ANDROID_CERT_FINGERPRINTS` (comma-separated).

Skipping this is the classic TWA failure: the app works in local
testing, then ships with Chrome's URL bar visible across the top for
every real user.

### 4. Upload

Play Console (one-time $25). Create the app, upload the `.aab`, fill the
listing.

## Play listing requirements to prepare

- Privacy policy URL — `https://intently-web.vercel.app/privacy` ✅ exists
- Data safety form — declare: email, photos, date of birth, phone
  (optional), location as free-text city
- Content rating questionnaire — dating apps rate Mature 17+
- Feature graphic 1024×500, phone screenshots, short + full description
- **Dating apps get extra scrutiny.** The existing photo moderation,
  selfie verification, block/report flows and Community Guidelines page
  are what the review looks for — they exist, so point at them.
- Target audience must be 18+; the sign-up form already enforces this
  (`isAtLeast18`)
