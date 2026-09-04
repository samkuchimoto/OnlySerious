# Setting up Stripe (subscription billing)

Used by `app/api/stripe/checkout`, `app/api/stripe/portal`, and
`app/api/stripe/webhook`. This is what makes the paid tier reachable at
all — before it existed, `subscriptionStatus` was written as `"free"` at
sign-up and nothing in the codebase could ever change it, so
`PAID_DAILY_LIKE_LIMIT` was unreachable and "paying subscriber" was not a
state a real account could be in.

Card details never touch this app — Checkout and the billing portal are
both Stripe-hosted pages we redirect to, which is what keeps this out of
PCI scope.

## What grants access

Only `app/api/stripe/webhook/route.ts`, after Stripe's signature over the
raw request body verifies. Landing on the `success_url` proves nothing —
anyone can type that URL — so the browser return is treated as cosmetic
and the webhook is the only writer of `subscriptionStatus`.

Firestore already backs this up: `subscriptionStatus`, `stripeCustomerId`
and `stripeSubscriptionId` are in the locked-field list in
`firestore.rules`, so a client cannot write itself into a paid state.
The webhook uses the Admin SDK, which bypasses rules.

## Steps

1. Create an account at [dashboard.stripe.com](https://dashboard.stripe.com).
   Thailand is supported; business verification takes a day or two, but
   **test mode works immediately** — you can wire up and test the whole
   flow before verification finishes.
2. **Product catalog** → **Add product**. Give it a name (e.g. "OSThai
   membership"), set a **recurring** monthly price, and save. Copy the
   **price ID** — it looks like `price_1ABC...`, not the product ID.
3. **Developers → API keys** → copy the **Secret key** (`sk_test_...` in
   test mode).
4. **Developers → Webhooks** → **Add endpoint**:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`,
     `customer.subscription.created`,
     `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Copy the **signing secret** (`whsec_...`).
5. Add all three to Vercel (**Project → Settings → Environment
   Variables**), plus the app URL used to build the redirect targets:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_1ABC...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://intently-web.vercel.app
```

6. Redeploy so the running app picks them up:

```
vercel --prod
```

Until all of these are set, the billing routes return `503` and the UI
says "Subscriptions aren't switched on yet" rather than throwing — so a
half-configured deploy degrades cleanly instead of 500ing on the
conversion moment.

## Testing it end to end

In test mode, card `4242 4242 4242 4242` with any future expiry and any
CVC completes a payment. After checkout:

- The Stripe dashboard shows a customer and an active subscription.
- The Firestore `users/{uid}` doc should flip to
  `subscriptionStatus: "active"` within a second or two.
- Browse should stop showing the daily-limit banner.

If the status doesn't flip, check **Developers → Webhooks → your
endpoint** for delivery attempts. A `400` there is almost always a
`STRIPE_WEBHOOK_SECRET` mismatch; a `503` means the env vars aren't set
on the deployment you're actually hitting.

To test webhooks against a local `next dev`, use the Stripe CLI:

```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints its own `whsec_...` for the local session — use that as
`STRIPE_WEBHOOK_SECRET` locally, not the dashboard one.

## Going live

Swap the test key and price ID for live-mode ones, and create a
**separate webhook endpoint in live mode** with the same four events —
live and test webhooks are configured independently, and forgetting the
live one is the classic way real payments succeed while nobody's account
gets upgraded.

## PromptPay (optional, Thailand)

Stripe supports PromptPay for Thai customers, but it is a
single-use/one-time payment method and does not support recurring
subscription billing — so it cannot back this `mode: "subscription"`
flow as-is. Adding it would mean modelling membership as recurring
one-time charges instead. Worth doing only if card conversion turns out
to be the bottleneck; it is not a drop-in setting.
