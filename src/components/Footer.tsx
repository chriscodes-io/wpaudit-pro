import Link from 'next/link';
import { MARKETING_URL } from '@/lib/site';

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-12 sm:px-[6%]">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-text">wpaudit.pro</p>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-2">
            Free WordPress health audits by Chris Smith — Technical SEO &amp; Web Engineer. Audits you can watch ship.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/how-it-works" className="text-[13px] text-muted no-underline hover:text-accent">
            How it works
          </Link>
          <Link href="/faq" className="text-[13px] text-muted no-underline hover:text-accent">
            FAQ
          </Link>
          <Link href="/audit" className="text-[13px] text-muted no-underline hover:text-accent">
            Run audit
          </Link>
          <a href={MARKETING_URL} className="text-[13px] text-muted no-underline hover:text-accent">
            Chris Smith
          </a>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-[1120px] font-mono-brand text-[11px] text-muted-3">
        © {new Date().getFullYear()} Chris Smith. All rights reserved.
      </p>
    </footer>
  );
}
