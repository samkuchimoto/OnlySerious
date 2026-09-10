// /components/InlineScript.tsx
//
// A blocking inline script that React will render without complaining.
//
// React warns in development whenever a component renders a <script>
// tag ("Scripts inside React components are never executed when
// rendering on the client"), and the warning is fair: on a client-side
// render the tag is inert. It is not fair for a script whose entire job
// is to run once, during HTML parsing, before the first paint — which
// is the only way to apply a client-only value without a flash.
//
// This is the escape hatch Next's own "preventing flash before
// hydration" guide prescribes: emit a real script on the server, and an
// inert text/plain block on the client, with suppressHydrationWarning
// covering the type difference between the two.

export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
