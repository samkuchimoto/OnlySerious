# Enabling Firebase Storage

Used by `app/api/photos/route.ts` to store uploaded profile photos. This
is a separate one-time step from Firestore — a new Firebase project
doesn't provision a Storage bucket automatically.

## Steps

1. Open the [Firebase console](https://console.firebase.google.com/project/onlyserious-1db69/storage)
   for this project and click **Get started** under Storage if you
   haven't already.
2. Choose **production mode** when asked (same choice as Firestore) —
   the app never relies on Storage's default security rules anyway,
   since all uploads go through `app/api/photos` using the Admin SDK,
   which bypasses rules entirely.
3. Pick the same region as your Firestore database if asked.

That's it — no rules to paste here, unlike Firestore. If you skip this,
photo uploads will fail with a "bucket does not exist" error until it's
done.
