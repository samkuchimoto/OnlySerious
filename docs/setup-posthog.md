# Setting up PostHog (funnel tracking)

Used by `lib/analytics.ts` and `instrumentation-client.ts`.

Answers the question Firestore can't: **where people fall out**. Firestore
tells you how many profiles went live. It can't tell you how many people
signed in with Google, saw the 3-photo requirement, and quit — because
those people never created a document.

Optional by design. With `NEXT_PUBLIC_POSTHOG_KEY` unset every `capture()`
is a silent no-op, so nothing here can break the app.

## Not a source of truth for money

Milestone payouts are verified against **Firestore** (real signups) and
the **Stripe dashboard** (real payments). PostHog is for diagnosing the
funnel. Ad-blockers make client-side analytics an undercount by nature —
never pay against a PostHog number.

## Steps

1. Sign up at [posthog.com](https://posthog.com). Pick a region and
   remember which — **EU and US are separate deployments** and a key from
   one is rejected by the other.
2. **Project Settings → Project API Key**, copy the `phc_...` key.
3. Add to Vercel (**Project → Settings → Environment Variables**):

```
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # or https://eu.i.posthog.com
```

4. Redeploy: `vercel --prod`

## Events emitted

| Event | Fires when | Properties |
| --- | --- | --- |
| `signup_started` | "Continue with Google" clicked | — |
| `profile_submitted` | Profile form saved | `gender` |
| `profile_live` | Moderation flips account to `active` | `gender`, `photoCount` |
| `like_sent` | A like is accepted | `matched` |
| `match_made` | Mutual like | — |
| `daily_limit_reached` | Free like limit hit | — |
| `upgrade_clicked` | Upgrade button pressed | `source` |
| `checkout_started` | Stripe returned a Checkout URL | — |
| `waitlist_joined` | Early-access email captured | — |

No email addresses or profile text are sent — Firestore already holds
that, and analytics is the wrong place for a second copy.

## The two funnels worth building first

**Registration** — `signup_started → profile_submitted → profile_live`.
The gap between the first two is form friction; between the last two is
the photo requirement. Break it down by `gender`, because men and women
are arriving from different places and drop off for different reasons.

**Monetization** — `daily_limit_reached → upgrade_clicked →
checkout_started`. The first ratio is whether the offer is compelling;
the second isolates billing failures from people simply not clicking.

## Attribution (how to verify the VA's numbers)

PostHog records UTM parameters on the first pageview of a session and
keeps them on the person, so a signup can be traced back to the link that
produced it. **This only works if the links are tagged before the traffic
runs** — it cannot be applied retroactively.

Give each platform its own link:

```
https://intently-web.vercel.app/?utm_source=tiktok&utm_medium=social&utm_campaign=va_marissa
https://intently-web.vercel.app/?utm_source=instagram&utm_medium=social&utm_campaign=va_marissa
https://intently-web.vercel.app/?utm_source=facebook&utm_medium=social&utm_campaign=va_jainen
```

Keep `utm_campaign` distinct per person. That is what separates "500
signups happened" from "500 signups happened *because of this person*" —
without it, organic traffic and each VA's traffic are indistinguishable,
and you are paying against a number you cannot attribute.

Then break the registration funnel down by `utm_source` to see which
platform converts, not just which one drives clicks.
