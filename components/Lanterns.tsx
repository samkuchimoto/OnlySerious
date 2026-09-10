// /components/Lanterns.tsx
//
// The "Lantern Floating Effect" — ambient upward drifts of warm
// particles on hero sections, per the Vibrant Dream brief.
//
// Three constraints shaped this into what it is:
//
//   Deterministic. The positions are a hard-coded table, not
//   Math.random(). A random layout differs between the server render
//   and the client render, which is a hydration mismatch — and the fix
//   people reach for (generate in an effect) means the hero paints
//   empty and then pops.
//
//   Cheap. Twelve absolutely-positioned dots animated with `transform`
//   and `opacity` only, so the whole effect runs on the compositor and
//   never triggers layout. This sits behind a hero photograph on phones
//   over Southeast Asian mobile networks; it is not allowed to cost
//   anything.
//
//   Silent. Decorative, so the layer is aria-hidden and
//   pointer-events:none, and it is removed outright under
//   prefers-reduced-motion (see globals.css) rather than merely slowed.

// left %, delay s, duration s, scale. Spread unevenly on purpose —
// evenly spaced points read as a progress bar rather than as lanterns.
const LANTERNS: [number, number, number, number][] = [
  [6, 0, 26, 1],
  [14, 9, 33, 0.7],
  [23, 3.5, 29, 1.3],
  [31, 15, 36, 0.8],
  [42, 6.5, 24, 1.1],
  [49, 19, 31, 0.6],
  [58, 2, 34, 0.9],
  [66, 12, 27, 1.25],
  [73, 22, 38, 0.75],
  [81, 5, 30, 1.05],
  [88, 16.5, 25, 0.85],
  [95, 10, 35, 1.15],
];

export function Lanterns({ className = "" }: { className?: string }) {
  return (
    <div className={`lanterns ${className}`} aria-hidden>
      {LANTERNS.map(([left, delay, duration, scale], i) => (
        <span
          key={i}
          className="lantern"
          style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            // Multiplies the keyframe's own scale rather than replacing
            // it, so each point still swells slightly as it rises.
            width: `${6 * scale}px`,
            height: `${6 * scale}px`,
          }}
        />
      ))}
    </div>
  );
}
