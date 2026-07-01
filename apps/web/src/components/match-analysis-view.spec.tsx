import type { ReactNode } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import type {
  MatchDetailDto,
  PredictionResponseDto,
  RiskBucketDto,
} from '@betvision/contracts';
import { renderWithProviders, enMessages as en } from '../test/test-utils';

const mockGetMatch = jest.fn<Promise<MatchDetailDto>, [string, string?]>();
const mockCreatePrediction =
  jest.fn<Promise<PredictionResponseDto>, [{ matchId: string; riskAppetite: number }, string?]>();

jest.mock('../lib/api', () => ({
  __esModule: true,
  matchesApi: { getMatch: (...args: [string, string?]) => mockGetMatch(...args) },
  analysisApi: {
    createPrediction: (...args: [{ matchId: string; riskAppetite: number }, string?]) =>
      mockCreatePrediction(...args),
  },
}));

jest.mock('../i18n/navigation', () => ({
  __esModule: true,
  Link: ({ children }: { children?: ReactNode }) => children,
}));

import { MatchAnalysisView } from './match-analysis-view';

const MATCH: MatchDetailDto = {
  id: 'm1',
  home: { id: 't1', name: 'Real Madrid', shortName: 'RMA', crestUrl: null },
  away: { id: 't2', name: 'Barcelona', shortName: 'BAR', crestUrl: null },
  competition: { id: 'c1', name: 'La Liga', country: 'ES' },
  seasonId: 's1',
  seasonLabel: '2025/26',
  kickoffUtc: '2026-05-01T19:00:00.000Z',
  status: 'scheduled',
  venue: 'Santiago Bernabéu',
  round: '35',
  importance: 90,
  referee: { id: 'r1', name: 'Mateu Lahoz' },
  stats: null,
  oddsSummary: { available: true },
};

function bucketOf(risk: number): RiskBucketDto {
  if (risk <= 33) return 'conservative';
  if (risk <= 66) return 'balanced';
  return 'aggressive';
}

/** The model numbers stay identical; only the recommendation set moves with the appetite. */
function makeResponse(riskAppetite: number): PredictionResponseDto {
  const aggressive = riskAppetite >= 67;
  return {
    predictionId: 'p1',
    matchId: 'm1',
    modelVersion: 'poisson-1',
    inputSnapshotHash: 'hash',
    riskAppetite,
    riskBucket: bucketOf(riskAppetite),
    results: [
      {
        market: '1X2',
        selection: 'Home',
        modelProbability: 0.52,
        impliedProbability: 0.48,
        edge: 0.04,
        expectedValue: 0.08,
        suggestedStakePct: 0.8,
        confidence: 'high',
        risk: 'low',
      },
    ],
    recommendations: [
      {
        market: '1X2',
        selection: 'Home',
        modelProbability: 0.52,
        impliedProbability: 0.48,
        oddsDecimal: 2.08,
        edge: 0.04,
        expectedValue: 0.08,
        riskAdjustedExpectedValue: 0.05,
        suggestedStakePct: 0.8,
        confidence: 'high',
        risk: 'low',
        rationaleCode: 'edge_ok',
        isBestBet: true,
      },
      // An extra, higher-variance alternative only surfaces at aggressive appetites.
      ...(aggressive
        ? [
            {
              market: 'BTTS' as const,
              selection: 'Yes',
              modelProbability: 0.6,
              impliedProbability: 0.55,
              oddsDecimal: 1.82,
              edge: 0.05,
              expectedValue: 0.09,
              riskAdjustedExpectedValue: 0.03,
              suggestedStakePct: 1.5,
              confidence: 'medium' as const,
              risk: 'high' as const,
              rationaleCode: 'aggressive_only',
              isBestBet: false,
            },
          ]
        : []),
    ],
    bestBet: {
      market: '1X2',
      selection: 'Home',
      modelProbability: 0.52,
      impliedProbability: 0.48,
      oddsDecimal: 2.08,
      edge: 0.04,
      expectedValue: 0.08,
      riskAdjustedExpectedValue: 0.05,
      suggestedStakePct: 0.8,
      confidence: 'high',
      risk: 'low',
      rationaleCode: 'edge_ok',
      isBestBet: true,
    },
    noValueFound: false,
    hint: null,
  };
}

describe('MatchAnalysisView', () => {
  beforeEach(() => {
    mockGetMatch.mockReset();
    mockCreatePrediction.mockReset();
    mockGetMatch.mockResolvedValue(MATCH);
    mockCreatePrediction.mockImplementation((body) =>
      Promise.resolve(makeResponse(body.riskAppetite)),
    );
  });

  it('renders the fixture header, then the report (results + best bet) on Analyze', async () => {
    renderWithProviders(<MatchAnalysisView matchId="m1" />);

    // Fixture header resolves.
    expect(await screen.findByText('Real Madrid')).toBeInTheDocument();
    expect(screen.getByText('Barcelona')).toBeInTheDocument();

    // Run analysis at the default appetite (33).
    fireEvent.click(screen.getByRole('button', { name: en.analysis.report.analyzeCta }));

    // Report renders with the market table + best bet.
    expect(
      await screen.findByText(en.analysis.report.summaryEyebrow),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(en.analysis.report.bestBetBadge).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);

    await waitFor(() => expect(mockCreatePrediction).toHaveBeenCalledTimes(1));
    expect(mockCreatePrediction.mock.calls[0][0]).toEqual({
      matchId: 'm1',
      riskAppetite: 33,
    });
    // The report states the risk it was analyzed at.
    expect(
      screen.getByText(
        en.analysis.report.analyzedAt
          .replace('{value}', '33')
          .replace('{max}', '100')
          .replace('{bucket}', en.analysis.slider.buckets.conservative.label),
      ),
    ).toBeInTheDocument();
  });

  it('re-runs POST /predictions with the NEW riskAppetite after moving the slider', async () => {
    renderWithProviders(<MatchAnalysisView matchId="m1" />);
    await screen.findByText('Real Madrid');

    // First run at 33.
    fireEvent.click(screen.getByRole('button', { name: en.analysis.report.analyzeCta }));
    await screen.findByText(en.analysis.report.summaryEyebrow);
    await waitFor(() => expect(mockCreatePrediction).toHaveBeenCalledTimes(1));

    // Move the slider to the maximum (aggressive) via the keyboard.
    const slider = screen.getByRole('slider', { name: en.analysis.slider.aria });
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');

    // Re-analyze — the CTA now reads "Re-analyze".
    fireEvent.click(screen.getByRole('button', { name: en.analysis.report.reanalyzeCta }));

    await waitFor(() => expect(mockCreatePrediction).toHaveBeenCalledTimes(2));
    expect(mockCreatePrediction.mock.calls[1][0]).toEqual({
      matchId: 'm1',
      riskAppetite: 100,
    });

    // The re-run surfaced the aggressive-only alternative + restated the new risk level.
    expect(await screen.findByText(en.analysis.markets.BTTS)).toBeInTheDocument();
    expect(
      screen.getByText(
        en.analysis.report.analyzedAt
          .replace('{value}', '100')
          .replace('{max}', '100')
          .replace('{bucket}', en.analysis.slider.buckets.aggressive.label),
      ),
    ).toBeInTheDocument();
  });
});
