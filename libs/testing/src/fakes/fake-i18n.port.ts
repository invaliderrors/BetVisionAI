// libs/testing/src/fakes/fake-i18n.port.ts
import type { I18nPort, Locale } from '@betvision/domain';
import type { ErrorParams } from '@betvision/shared';

/**
 * Passthrough i18n: returns the `code` verbatim (optionally with a locale prefix and
 * serialized params) so tests can assert on stable codes rather than localized prose.
 */
export class FakeI18nPort implements I18nPort {
  resolve(code: string, params: ErrorParams, locale: Locale): string {
    const keys = Object.keys(params);
    const suffix = keys.length ? ` ${JSON.stringify(params)}` : '';
    return `[${locale}] ${code}${suffix}`;
  }
}
