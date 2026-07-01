// apps/web/src/i18n/request.ts
// Per-request i18n config for next-intl (App Router). Resolves the active locale and loads the
// matching message catalog. Referenced by the next-intl plugin in next.config.js.
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
