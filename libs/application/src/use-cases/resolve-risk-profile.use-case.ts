// libs/application/src/use-cases/resolve-risk-profile.use-case.ts
// Sample use case that proves the hexagonal layering end-to-end with ZERO IO:
// it depends only on domain ports/services (all injected) and returns a Result.
//
// Flow: validate slider → resolve RiskProfile (pure domain service) → stamp id + time
// via injected ports → write an audit entry via an outbound port → return a DTO.
import { Result, ok, DomainError } from '@betvision/shared';
import {
  RiskAppetite,
  type RiskProfile,
  type RiskBucket,
  type RiskProfileService,
  type ClockPort,
  type IdGeneratorPort,
  type AuditLogPort,
  type UserId,
  type IsoDateTime,
} from '@betvision/domain';

export interface ResolveRiskProfileCommand {
  readonly riskAppetite: number;
  readonly actorId?: UserId | null;
}

export interface ResolveRiskProfileResult {
  readonly id: string;
  readonly resolvedAt: IsoDateTime;
  readonly appetite: number;
  readonly bucket: RiskBucket;
  readonly profile: RiskProfile;
}

export class ResolveRiskProfileUseCase {
  constructor(
    private readonly riskProfiles: RiskProfileService,
    private readonly clock: ClockPort,
    private readonly ids: IdGeneratorPort,
    private readonly audit: AuditLogPort,
  ) {}

  async execute(
    command: ResolveRiskProfileCommand,
  ): Promise<Result<ResolveRiskProfileResult, DomainError>> {
    const appetiteResult = RiskAppetite.create(command.riskAppetite);
    if (!appetiteResult.ok) return appetiteResult;

    const appetite = appetiteResult.value;
    const profile = this.riskProfiles.resolve(appetite);
    const resolvedAt = this.clock.now();
    const id = this.ids.newId();

    await this.audit.record({
      actorId: command.actorId ?? null,
      action: 'risk_profile.resolved',
      entity: 'RiskProfile',
      entityId: id,
      metadata: { appetite: appetite.value, bucket: profile.bucket },
      occurredAt: resolvedAt,
    });

    return ok({
      id,
      resolvedAt,
      appetite: appetite.value,
      bucket: profile.bucket,
      profile,
    });
  }
}
