// libs/infrastructure/src/i18n/i18n-translator.ts
// A narrow seam over the i18n backend. nestjs-i18n's `I18nService.translate` satisfies
// this shape structurally, but depending on the narrow interface (instead of the concrete
// Nest service) keeps the adapter unit-testable with ZERO framework/IO and keeps
// libs/infrastructure decoupled from Nest internals. The composition root (apps/*) binds
// the real nestjs-i18n service to this interface.

export interface I18nTranslateOptions {
  /** Target language, e.g. 'en' | 'es'. */
  readonly lang?: string;
  /** Interpolation arguments, referenced as `{name}` placeholders in the catalog. */
  readonly args?: Readonly<Record<string, unknown>>;
}

export interface I18nTranslator {
  translate(key: string, options?: I18nTranslateOptions): string;
}
