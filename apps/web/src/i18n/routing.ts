// apps/web/src/i18n/routing.ts
// Single source of truth for the app's locale routing (Feature Spec A). Segment-based
// (/[locale]/...) so URLs are shareable + SSR-friendly. Locales mirror the contracts localeSchema.
import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'es'] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = 'en';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Persist the user's choice; next-intl reads/writes the NEXT_LOCALE cookie on navigation.
  localeCookie: true,
  localePrefix: 'always',
});
