import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col text-[var(--foreground)]">
      <header className="canvas flex flex-wrap items-center justify-between gap-y-2 py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_CONFIG.appTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
          <Link href="/terms" className="transition-colors hover:text-[var(--foreground)]">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[var(--foreground)]">
            Privacy
          </Link>
          <Link href="/community-guidelines" className="transition-colors hover:text-[var(--foreground)]">
            Guidelines
          </Link>
          <Link href="/safety" className="transition-colors hover:text-[var(--foreground)]">
            Safety
          </Link>
        </div>
      </header>
      <section className="canvas measure flex-1 pb-20">
        <div className="flex flex-col gap-4 pt-4 text-sm leading-relaxed text-[var(--foreground)] [&_h1]:text-2xl [&_h1]:font-medium [&_h1]:tracking-tight [&_h1]:text-[var(--foreground)] [&_h1]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-[var(--foreground)]">
          {children}
        </div>
      </section>
    </main>
  );
}
