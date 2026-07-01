// apps/api/src/app/i18n.options.ts
// Central nestjs-i18n configuration. Catalogs live in `./i18n/{en,es}/*.json`, co-located
// with this module so `__dirname` resolves correctly BOTH under ts-jest (source dir =
// apps/api/src/app) AND in the webpack bundle (dir = dist/apps/api, where the webpack
// `assets` rule copies the catalogs to `i18n/`).
import { join } from 'node:path';
import { AcceptLanguageResolver, HeaderResolver, type I18nOptions } from 'nestjs-i18n';

export function i18nOptions(fallbackLanguage = 'en'): I18nOptions {
  return {
    fallbackLanguage,
    loaderOptions: {
      path: join(__dirname, 'i18n'),
      watch: false,
    },
    // Resolvers are used by nestjs-i18n's own request context; the exception filter passes
    // an explicit `lang` derived from Accept-Language, so behavior is deterministic either way.
    resolvers: [new HeaderResolver(['x-lang']), AcceptLanguageResolver],
    // Missing keys fall back to the key itself instead of throwing — keeps the API resilient.
    throwOnMissingKey: false,
    logging: false,
  };
}
