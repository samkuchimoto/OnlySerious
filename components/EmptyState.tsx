// /components/EmptyState.tsx
//
// The empty state for discovery surfaces — Browse, Matches, Likes.
//
// These used to be mascot empty states. The illustrated character has
// since been removed from the product entirely, and an empty grid was
// the worst place for one anyway: it is the moment a visitor is already
// deciding the platform is dead, and a cartoon is not what convinces
// them otherwise.
//
// What replaces it is typographic and quiet — a gold rule, a serif
// heading, and a reason. The reason is the load-bearing part. "No
// results" reads as a broken app; "no one matching *your preferences*
// is active right now, widening your range usually helps" reads as a
// working app with a filter set too tight, which is almost always the
// truth.

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center sm:py-24">
      {/* A brass hairline instead of an illustration. Carries the
          palette into the empty state so it still looks like the
          product rather than like a missing component. */}
      <span
        aria-hidden
        className="h-px w-16 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent"
      />
      <h2 className="display mt-6 text-2xl">{title}</h2>
      {body && (
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">{body}</p>
      )}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}
