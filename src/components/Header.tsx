import Link from 'next/link';
import { MARKETING_URL } from '@/lib/site';

const links = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faq', label: 'FAQ' },
  { href: '/audit', label: 'Run audit' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-[62px] max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-[6%]">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 no-underline">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[7px] bg-accent font-mono-brand text-[13px] font-semibold text-black">
            WP
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-text">wpaudit.pro</span>
            <span className="hidden font-mono-brand text-[10px] tracking-wide text-muted sm:block">
              Premium WordPress audits
            </span>
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-5 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] text-muted no-underline transition-colors hover:text-accent"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={MARKETING_URL}
            className="inline-flex h-10 items-center rounded-lg bg-accent px-[18px] text-sm font-semibold text-black no-underline transition-opacity hover:opacity-85"
          >
            Work with Chris
          </a>
        </nav>
        <Link
          href="/audit"
          className="inline-flex h-10 items-center rounded-lg bg-accent px-3.5 text-sm font-semibold text-black no-underline md:hidden"
        >
          Audit
        </Link>
      </div>
    </header>
  );
}
