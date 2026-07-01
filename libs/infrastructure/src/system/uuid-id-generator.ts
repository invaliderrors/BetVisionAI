// libs/infrastructure/src/system/uuid-id-generator.ts
// Production IdGeneratorPort adapter (cryptographically-random UUID v4). Used for user ids,
// refresh-token family ids + jtis, and reset tokens. Tests use FakeIdGeneratorPort.
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { IdGeneratorPort } from '@betvision/domain';

@Injectable()
export class UuidIdGenerator implements IdGeneratorPort {
  newId(): string {
    return randomUUID();
  }
}
