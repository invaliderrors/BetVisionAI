// apps/web/src/middleware.ts
// next-intl locale routing middleware: negotiates /[locale]/ prefixes and the NEXT_LOCALE
// cookie. Route protection is handled client-side (the access token is in memory, never a
// readable cookie), so this middleware only concerns i18n.
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match everything except Next internals, the API proxy path, and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
