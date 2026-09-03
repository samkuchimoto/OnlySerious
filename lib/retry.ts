// /lib/retry.ts
// A transient blip (one dropped request, a momentary rate limit) is the
// overwhelmingly common real-world failure mode — not a real outage. Retry
// it automatically before ever showing the user an error; only a failure
// that survives every attempt is a real failure worth surfacing.

const DEFAULT_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

export async function withRetry<T>(fn: () => Promise<T>, attempts = DEFAULT_ATTEMPTS): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        // Exponential backoff with jitter — spreads retries out instead
        // of every failed client hammering Firestore at the exact same
        // moment a real outage recovers.
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastErr;
}
