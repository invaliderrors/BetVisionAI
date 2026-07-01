import type { ErrorParams } from '@betvision/shared';
import { NestI18nAdapter } from './nest-i18n.adapter';
import type { I18nTranslateOptions, I18nTranslator } from './i18n-translator';

/**
 * Tiny in-memory translator mirroring how nestjs-i18n resolves a key per language and
 * interpolates `{name}` args. Proves the adapter localizes the SAME code differently by
 * locale, with ZERO framework/IO.
 */
const CATALOG: Record<string, Record<string, (a: Readonly<Record<string, unknown>>) => string>> = {
  en: {
    'domain.vo.probability_out_of_range': (a) =>
      `Probability must be between ${a['min']} and ${a['max']}, but got ${a['value']}.`,
  },
  es: {
    'domain.vo.probability_out_of_range': (a) =>
      `La probabilidad debe estar entre ${a['min']} y ${a['max']}, pero se recibió ${a['value']}.`,
  },
};

class InMemoryTranslator implements I18nTranslator {
  readonly calls: Array<{ key: string; options?: I18nTranslateOptions }> = [];

  translate(key: string, options?: I18nTranslateOptions): string {
    this.calls.push({ key, options });
    const lang = options?.lang ?? 'en';
    const render = CATALOG[lang]?.[key];
    return render ? render(options?.args ?? {}) : key;
  }
}

describe('NestI18nAdapter', () => {
  const params: ErrorParams = { field: 'probability', value: 5, min: 0, max: 1 };

  it('renders the SAME code in English and Spanish', () => {
    const adapter = new NestI18nAdapter(new InMemoryTranslator());

    const en = adapter.resolve('domain.vo.probability_out_of_range', params, 'en');
    const es = adapter.resolve('domain.vo.probability_out_of_range', params, 'es');

    expect(en).toBe('Probability must be between 0 and 1, but got 5.');
    expect(es).toBe('La probabilidad debe estar entre 0 y 1, pero se recibió 5.');
    expect(en).not.toBe(es);
  });

  it('forwards the locale as `lang` and the params as `args`', () => {
    const translator = new InMemoryTranslator();
    const adapter = new NestI18nAdapter(translator);

    adapter.resolve('domain.vo.probability_out_of_range', params, 'es');

    expect(translator.calls).toHaveLength(1);
    expect(translator.calls[0]?.options?.lang).toBe('es');
    expect(translator.calls[0]?.options?.args).toEqual(params);
  });

  it('returns the code verbatim when no translation exists (safe fallback)', () => {
    const adapter = new NestI18nAdapter(new InMemoryTranslator());

    expect(adapter.resolve('domain.unknown.code', {}, 'en')).toBe(
      'domain.unknown.code',
    );
  });
});
