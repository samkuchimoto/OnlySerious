# Setting up Vercel Blob (photo storage)

Used by `app/api/photos/route.ts` to store uploaded profile photos.
Chosen over Firebase Storage specifically because Firebase Storage now
requires upgrading to the Blaze (pay-as-you-go) plan — a real card on
file — even for light usage. Vercel Blob is free on the Hobby plan
(5GB storage, 100K operations/month included) with no card required at
all, and it's already on the same Vercel account this app is deployed
to.

## Steps

1. Open the [intently-web project](https://vercel.com/samkuchimotos-projects/intently-web) in the Vercel dashboard.
2. Go to the **Storage** tab → **Create Database** → choose **Blob**.
3. Name it and create it — Vercel automatically connects it to this
   project and injects `BLOB_READ_WRITE_TOKEN` into its environment
   variables. There's nothing to copy/paste by hand.
4. Redeploy so the running app picks up the new env var:

```
vercel --prod
```

## Limits

Free on Hobby up to 5GB stored and 100K "simple" operations/month.
Going over just pauses Blob access for 30 days rather than charging you
— see [Vercel's Blob pricing page](https://vercel.com/docs/vercel-blob/usage-and-pricing)
for the current numbers.
