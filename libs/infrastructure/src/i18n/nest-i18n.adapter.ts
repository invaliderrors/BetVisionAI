// libs/infrastructure/src/i18n/nest-i18n.adapter.ts
// Concrete I18nPort adapter. The domain/use-cases emit STABLE codes + params
// (never localized prose); this adapter is the single place that turns a
// (code, params, locale) triple into a human string, delegating to the i18n
// backend (nestjs-i18n at runtime — see the composition root).
import type { I18nPort, Locale } from '@betvision/domain';
import type { ErrorParams } from '@betvision/shared';
import type { I18nTranslator } from './i18n-translator';

export class NestI18nAdapter implements I18nPort {
  constructor(private readonly translator: I18nTranslator) {}

  resolve(code: string, params: ErrorParams, locale: Locale): string {
    return this.translator.translate(code, {
      lang: locale,
      args: { ...params },
    });
  }
}
