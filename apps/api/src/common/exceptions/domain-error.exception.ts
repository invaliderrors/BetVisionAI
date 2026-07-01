// apps/api/src/common/exceptions/domain-error.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import type { DomainError } from '@betvision/shared';

/**
 * Bridges a domain `DomainError` (code + params, no localized prose) into the HTTP layer.
 * The exception filter reads the carried `DomainError` and localizes it per request locale,
 * so use-cases/controllers keep returning CODES and never build user-facing strings.
 */
export class DomainErrorException extends HttpException {
  constructor(
    readonly domainError: DomainError,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(domainError.code, status);
  }
}
