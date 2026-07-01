// libs/domain/src/ports/id-generator.port.ts
/** Injectable ID source — deterministic in tests, UUID/ULID in production. */
export interface IdGeneratorPort {
  newId(): string;
}
