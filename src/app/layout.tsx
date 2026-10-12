import type { Metadata } from 'next';
import { JetBrains_Mono, Outfit } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { JsonLd } from '@/components/JsonLd';
import { BRAND, MARKETING_URL, SAME_AS, SITE_URL } from '@/lib/site';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'wpaudit.pro — Instant WordPress Site Audits',
    template: '%s · wpaudit.pro',
  },
  description:
    'Run automated performance, SEO, AEO/GEO, security, and accessibility audits on any WordPress site in under 60 seconds. Free PDF report by email.',
  keywords: [
    'WordPress audit',
    'site health',
    'technical SEO',
    'AEO',
    'GEO',
    'Core Web Vitals',
    'accessibility',
  ],
  authors: [{ name: BRAND.author, url: MARKETING_URL }],
  creator: BRAND.author,
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: SITE_URL,
    siteName: BRAND.name,
    title: 'wpaudit.pro — Instant WordPress Site Audits',
    description:
      'Free WordPress health checks covering performance, SEO, AEO/GEO, security, and accessibility.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'wpaudit.pro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'wpaudit.pro — Instant WordPress Site Audits',
    description: 'Free WordPress health checks with PDF report via email.',
    images: ['/og-default.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: BRAND.name,
      description: BRAND.tagline,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-AU',
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'wpaudit.pro',
      url: SITE_URL,
      sameAs: [...SAME_AS],
      founder: { '@id': `${SITE_URL}/#person` },
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#person`,
      name: BRAND.author,
      jobTitle: BRAND.authorRole,
      url: MARKETING_URL,
      sameAs: [...SAME_AS],
    },
    {
      '@type': 'SoftwareApplication',
      name: BRAND.product,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'AUD',
      },
      author: { '@id': `${SITE_URL}/#person` },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body className={`${outfit.variable} ${jetbrains.variable} min-h-screen antialiased`}>
        <JsonLd data={orgJsonLd} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-black"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
