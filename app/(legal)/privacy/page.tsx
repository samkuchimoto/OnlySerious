import { BRAND_CONFIG } from "@/config/brand";

export default function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-xs text-[var(--muted)]">
        Draft — this is a real first version, not placeholder text, but hasn&apos;t had a legal review yet.
      </p>

      <h2>What we collect</h2>
      <p>
        Your name, birthdate, gender, city/country, phone number, the photos, headline, and bio you add to
        your profile, and the messages you send to matches. Photos are also sent to two third-party
        moderation services (Groq and, when configured, Google Cloud Vision) purely to check them for
        prohibited content before they&apos;re shown to anyone — see {BRAND_CONFIG.appTitle}&apos;s photo
        policy in our Terms.
      </p>

      <h2>Who can see it</h2>
      <p>
        Your name, age, city, photos, headline, and bio are visible to other signed-in members once your
        profile is live. Your phone number and email are never shown to other members — they exist so we can
        verify you&apos;re a real person and, if it&apos;s ever genuinely necessary, trace an account back to
        one.
      </p>

      <p>
        There is one exception, and it only happens if you switch it on yourself. In Settings you can
        choose to appear on our public homepage. If you do, your <strong>first name</strong>, age,
        city, occupation, first approved photo, verification status, and the length of your voice
        intro become visible to anyone on the internet, including people without an account and
        search engines. Your bio, your other photos, the voice recording itself, and your contact
        details are never published. This is off unless you turn it on, we ask for it separately
        rather than bundling it into sign-up, and you can switch it off at any time — your card comes
        down within a minute.
      </p>

      <h2>What we don&apos;t do</h2>
      <p>
        We don&apos;t sell your data. We don&apos;t use your nationality, or anyone else&apos;s, as an input
        to matching, pricing, or access anywhere in the product.
      </p>

      <h2>Where it&apos;s stored</h2>
      <p>
        Firebase (Google) for your profile data and authentication, Vercel Blob for photos. Both are
        established infrastructure providers; neither has access to use your data beyond storing and serving
        it for {BRAND_CONFIG.appTitle}.
      </p>

      <h2>Deleting your data</h2>
      <p>
        Deleting your account from Settings permanently removes your profile, photos, and message history
        from our systems.
      </p>
    </>
  );
}
