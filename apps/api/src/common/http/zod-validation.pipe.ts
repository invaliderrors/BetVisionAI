// apps/api/src/common/http/zod-validation.pipe.ts
// Validates a request payload against a shared zod contract (libs/contracts). On failure it
// throws a BadRequestException with a string[] `message` so the global exception filter maps
// it to the localized `errors.validation` envelope (details = per-field messages).
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => {
        const path = issue.path.join('.') || '(body)';
        return `${path}: ${issue.message}`;
      });
      throw new BadRequestException({ message: messages });
    }
    return result.data;
  }
}
