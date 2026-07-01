import { axe, toHaveNoViolations } from 'jest-axe';
import { screen } from '@testing-library/react';
import type {
  MatchDetailDto,
  PredictionResponseDto,
} from '@betvision/contracts';
import { renderWithIntl } from '../test/test-utils';
import en from '../../messages/en.json';
import es from '../../messages/es.json';
import { PredictionReport } from './prediction-report';

expect.extend(toHaveNoViolations);

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

// riskAppetite 33 -> conservative. The NUMBERS are fixed; only the copy should change by locale.
const RESULT: PredictionResponseDto = {
  predictionId: 'p1',
  matchId: 'm1',
  modelVersion: 'poisson-1',
  inputSnapshotHash: 'hash',
  riskAppetite: 33,
  riskBucket: 'conservative',
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

function analyzedAt(catalog: typeof en): string {
  return catalog.analysis.report.analyzedAt
    .replace('{value}', '33')
    .replace('{max}', '100')
    .replace('{bucket}', catalog.analysis.slider.buckets.conservative.label);
}

describe('PredictionReport i18n', () => {
  it('renders the report copy from the English catalog', () => {
    renderWithIntl(<PredictionReport match={MATCH} result={RESULT} />, {
      locale: 'en',
      messages: en,
    });
    expect(screen.getByText(en.analysis.report.summaryEyebrow)).toBeInTheDocument();
    expect(screen.getByText(en.analysis.report.varianceReminder)).toBeInTheDocument();
    expect(screen.getByText(analyzedAt(en))).toBeInTheDocument();
    // Spanish copy is absent under the English locale.
    expect(
      screen.queryByText(es.analysis.report.summaryEyebrow),
    ).not.toBeInTheDocument();
  });

  it('renders the SAME component fully in Spanish — identical numbers, translated copy', () => {
    renderWithIntl(<PredictionReport match={MATCH} result={RESULT} />, {
      locale: 'es',
      messages: es,
    });
    expect(screen.getByText(es.analysis.report.summaryEyebrow)).toBeInTheDocument();
    // The risk line keeps the numbers 33/100 but localizes the surrounding copy + bucket.
    expect(screen.getByText(analyzedAt(es))).toBeInTheDocument();
    expect(
      screen.queryByText(en.analysis.report.summaryEyebrow),
    ).not.toBeInTheDocument();
  });

  it('states the risk level differently across locales', () => {
    const enLine = analyzedAt(en);
    const esLine = analyzedAt(es);
    expect(enLine).not.toEqual(esLine);
    // But both carry the identical 33/100 model-independent numbers.
    expect(enLine).toContain('33/100');
    expect(esLine).toContain('33/100');
  });
});

describe('PredictionReport accessibility', () => {
  it('has no detectable a11y violations', async () => {
    const { container } = renderWithIntl(
      <PredictionReport match={MATCH} result={RESULT} />,
      { locale: 'en', messages: en },
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
