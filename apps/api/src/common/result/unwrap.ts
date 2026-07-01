// apps/api/src/common/result/unwrap.ts
// Bridge a use-case Result<T, DomainError> into the HTTP layer: return the value on success,
// or raise a DomainErrorException (localized by the global filter) with a status derived from
// the error code. Keeps controllers free of localized strings + status boilerplate.
import { HttpStatus } from '@nestjs/common';
import {
  DomainErrorCode,
  type DomainError,
  type Result,
} from '@betvision/shared';
import { DomainErrorException } from '../exceptions/domain-error.exception';

const STATUS_BY_CODE: Readonly<Record<string, HttpStatus>> = {
  [DomainErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [DomainErrorCode.INVALID_REFRESH_TOKEN]: HttpStatus.UNAUTHORIZED,
  [DomainErrorCode.ACCOUNT_NOT_ACTIVE]: HttpStatus.FORBIDDEN,
  [DomainErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [DomainErrorCode.USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
};

export function unwrap<T>(result: Result<T, DomainError>): T {
  if (result.ok) return result.value;
  const status = STATUS_BY_CODE[result.error.code] ?? HttpStatus.BAD_REQUEST;
  throw new DomainErrorException(result.error, status);
}
