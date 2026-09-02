import { BRAND_CONFIG } from "@/config/brand";

export default function Terms() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-xs text-neutral-400">
        Draft — this is a real first version, not placeholder text, but hasn&apos;t had a legal review yet.
      </p>

      <h2>Who can use {BRAND_CONFIG.appTitle}</h2>
      <p>
        You must be 18 or older to create a profile. We check the date of birth you provide at sign-up; giving
        a false birthdate to get around this is a violation of these Terms and grounds for removal.
      </p>

      <h2>Your account</h2>
      <p>
        Every account is tied to a real phone number, verified by SMS, applied equally to every member
        regardless of gender — this is how we can trace an account back to a real person if something goes
        wrong. You&apos;re responsible for what happens under your account.
      </p>

      <h2>Your content</h2>
      <p>
        Every photo you upload is checked by an automated moderation system before it&apos;s shown to anyone
        else — photos that are AI-generated, sexually explicit, or otherwise too suggestive for this platform
        (swimwear, underwear, shirtless) are rejected. At least three real, approved photos are required
        before your profile goes live. Messages are automatically screened for commercial solicitation
        language and flagged for review — this isn&apos;t a hookup or sugar-dating platform, and using it as
        one is a Terms violation.
      </p>

      <h2>What you can&apos;t do</h2>
      <ul className="list-disc pl-5">
        <li>Impersonate someone else or misrepresent who you are.</li>
        <li>Harass, threaten, or abuse another member.</li>
        <li>Solicit money, gifts, or commercial services from other members.</li>
        <li>Use the platform for anything illegal.</li>
        <li>Attempt to circumvent the photo or message moderation described above.</li>
      </ul>

      <h2>Termination</h2>
      <p>
        We can suspend or remove an account that violates these Terms. You can delete your account at any
        time from Settings — this permanently removes your profile, photos, and message history.
      </p>

      <h2>Changes</h2>
      <p>These Terms may change as the platform develops. We&apos;ll update this page when they do.</p>
    </>
  );
}
