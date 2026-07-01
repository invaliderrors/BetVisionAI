import { ConfidenceLevel, RiskLevel, confidenceAtLeast, riskAtMost } from './levels';

describe('levels ordinal helpers', () => {
  it('confidenceAtLeast is an inclusive >= comparison', () => {
    expect(confidenceAtLeast(ConfidenceLevel.High, ConfidenceLevel.Medium)).toBe(true);
    expect(confidenceAtLeast(ConfidenceLevel.Medium, ConfidenceLevel.Medium)).toBe(true);
    expect(confidenceAtLeast(ConfidenceLevel.Low, ConfidenceLevel.Medium)).toBe(false);
  });

  it('riskAtMost is an inclusive <= comparison', () => {
    expect(riskAtMost(RiskLevel.Low, RiskLevel.Medium)).toBe(true);
    expect(riskAtMost(RiskLevel.Medium, RiskLevel.Medium)).toBe(true);
    expect(riskAtMost(RiskLevel.High, RiskLevel.Medium)).toBe(false);
  });
});
