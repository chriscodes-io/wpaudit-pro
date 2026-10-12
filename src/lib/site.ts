export const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);

export const MARKETING_URL = 'https://lightsalmon-bison-476856.hostingersite.com';

export const BRAND = {
  name: 'wpaudit.pro',
  product: 'WP Audit Pro',
  tagline: 'Instant WordPress site audits',
  author: 'Chris Smith',
  authorRole: 'Technical SEO · Web Engineer',
  accent: '#00FF7F',
  bg: '#080808',
} as const;

export const SAME_AS = [
  MARKETING_URL,
  'https://github.com/chriscodes-io',
  'https://www.linkedin.com/in/chrissmith',
] as const;
