// libs/domain/src/ports/i18n.port.ts
import type { Locale } from './shared.dto';
import type { ErrorParams } from '@betvision/shared';

/**
 * The ONLY bridge from domain error/message codes to human strings.
 * The domain depends on this interface; the concrete catalog lives in libs/infrastructure.
 */
export interface I18nPort {
  resolve(code: string, params: ErrorParams, locale: Locale): string;
}
