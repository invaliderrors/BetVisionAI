// apps/api/src/health/health.types.ts
export type HealthStatus = 'up' | 'down';

export interface ComponentHealth {
  readonly status: HealthStatus;
  readonly error?: string;
}

export type HealthChecks = Readonly<Record<string, ComponentHealth>>;

export interface LivenessResult {
  readonly status: 'ok';
  readonly uptimeSeconds: number;
  readonly timestamp: string;
}

export interface ReadinessResult {
  readonly status: 'ok';
  readonly checks: HealthChecks;
}
