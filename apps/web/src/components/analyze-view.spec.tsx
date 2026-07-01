import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import type { AnalyzeFixtureResponseDto } from '@betvision/contracts';
import { renderWithProviders, enMessages as en } from '../test/test-utils';
import esMessages from '../../messages/es.json';

type AnalyzeArgs = [
  { query: string; riskAppetite: number; language: 'en' | 'es' },
  string?,
  { signal?: AbortSignal }?,
];

const mockAnalyzeFixture =
  jest.fn<Promise<AnalyzeFixtureResponseDto>, AnalyzeArgs>();

jest.mock('../lib/api', () => ({
  __esModule: true,
  analyzeApi: {
    analyzeFixture: (...args: AnalyzeArgs) => mockAnalyzeFixture(...args),
  },
}));

import { AnalyzeView } from './analyze-view';

expect.extend(toHaveNoViolations);

/** A complete, contract-shaped analyze response. Numbers stay fixed; only recommendations move. */
function makeResponse(riskAppetite: number): AnalyzeFixtureResponseDto {
  const aggressive = riskAppetite >= 67;
  const bucket =
    riskAppetite <= 33 ? 'conservative' : riskAppetite <= 66 ? 'balanced' : 'aggressive';
  const bestBet = {
    market: '1X2' as const,
    selection: 'Portugal',
    modelProbability: 0.47,
    impliedProbability: 0.44,
    oddsDecimal: 2.27,
    edge: 0.03,
    expectedValue: 0.06,
    riskAdjustedExpectedValue: 0.04,
    suggestedStakePct: 0.7,
    confidence: 'medium' as const,
    risk: 'medium' as const,
    rationaleCode: 'edge_ok',
    isBestBet: true,
  };
  return {
    query: 'Portugal vs Spain',
    resolvedFixture: {
      home: { name: 'Portugal', country: 'PT' },
      away: { name: 'Spain', country: 'ES' },
      competition: 'UEFA Nations League',
      kickoffUtc: '2026-06-05T19:00:00.000Z',
    },
    prediction: {
      predictionId: 'p1',
      matchId: 'analyze:portugal-spain',
      modelVersion: 'poisson-1',
      inputSnapshotHash: 'hash',
      riskAppetite,
      riskBucket: bucket,
      results: [
        {
          market: '1X2',
          selection: 'Portugal',
          modelProbability: 0.47,
          impliedProbability: 0.44,
          edge: 0.03,
          expectedValue: 0.06,
          suggestedStakePct: 0.7,
          confidence: 'medium',
          risk: 'medium',
        },
      ],
      recommendations: [
        bestBet,
        ...(aggressive
          ? [
              {
                market: 'BTTS' as const,
                selection: 'Yes',
                modelProbability: 0.58,
                impliedProbability: 0.54,
                oddsDecimal: 1.85,
                edge: 0.04,
                expectedValue: 0.07,
                riskAdjustedExpectedValue: 0.02,
                suggestedStakePct: 1.2,
                confidence: 'medium' as const,
                risk: 'high' as const,
                rationaleCode: 'aggressive_only',
                isBestBet: false,
              },
            ]
          : []),
      ],
      bestBet,
      noValueFound: false,
      hint: null,
    },
    report: {
      id: 'r1',
      predictionId: 'p1',
      matchId: 'analyze:portugal-spain',
      language: 'en',
      summary: 'Portugal edge a tight Iberian derby on recent scoring form.',
      recentForm: 'Portugal WWDWL; Spain WWDWW.',
      keyDataPoints: ['Portugal 2.1 xG/game', 'Spain conceded in 3 of last 4'],
      risks: ['Rotation risk near a tournament break'],
      keyVariables: ['Home advantage', 'xG differential'],
      reasoning: 'The model favours Portugal marginally once home advantage is applied.',
      marketRationale: 'The 1X2 home price carries a small positive edge.',
      responsibleGamblingWarning:
        'This is a probabilistic estimate, not advice to bet. Set limits and take breaks.',
      predictions: [],
      recommendedMarkets: [],
      bestBet: null,
      alternatives: [],
      confidence: 'medium',
      risk: 'medium',
      sources: [],
      riskAppetite,
      riskBucket: bucket,
      generatedAt: '2026-06-01T12:00:00.000Z',
      modelVersion: 'poisson-1',
    },
    sources: [
      {
        label: 'Portugal recent results — ESPN',
        provider: 'ESPN',
        url: 'https://example.com/portugal-form',
      },
      { label: 'Spain squad notes', provider: 'Marca' },
    ],
    disclaimer:
      'These inputs were estimated by AI research, not a licensed data feed. Treat every number as an estimate.',
    aiEstimatedInputs: true,
    provenance: 'LLM_RESEARCH',
  };
}

describe('AnalyzeView', () => {
  beforeEach(() => {
    mockAnalyzeFixture.mockReset();
    mockAnalyzeFixture.mockImplementation((body) =>
      Promise.resolve(makeResponse(body.riskAppetite)),
    );
  });

  it('requires a non-empty fixture query before it will submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnalyzeView />);

    await user.click(
      screen.getByRole('button', { name: en.analyze.form.submit }),
    );

    expect(
      await screen.findByText(en.analyze.form.errors.queryRequired),
    ).toBeInTheDocument();
    expect(mockAnalyzeFixture).not.toHaveBeenCalled();
  });

  it('submits with the RiskSlider value as riskAppetite and renders results + recommendations', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnalyzeView />);

    await user.type(
      screen.getByLabelText(en.analyze.form.queryLabel),
      'Portugal vs Spain',
    );
    await user.click(
      screen.getByRole('button', { name: en.analyze.form.submit }),
    );

    // The result renders: resolved fixture, narrative, recommendations. The team names appear in
    // both the resolved-fixture header and the reused prediction report, hence getAllByText.
    expect((await screen.findAllByText('Portugal')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Spain').length).toBeGreaterThan(0);
    expect(
      screen.getByText(makeResponse(33).report.summary),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(en.analysis.report.bestBetBadge).length,
    ).toBeGreaterThan(0);

    // riskAppetite is wired straight from the slider default (33).
    await waitFor(() => expect(mockAnalyzeFixture).toHaveBeenCalledTimes(1));
    expect(mockAnalyzeFixture.mock.calls[0][0]).toEqual({
      query: 'Portugal vs Spain',
      riskAppetite: 33,
      language: 'en',
    });
  });

  it('re-runs POST /analyze with the NEW riskAppetite after moving the slider', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnalyzeView />);

    await user.type(
      screen.getByLabelText(en.analyze.form.queryLabel),
      'Portugal vs Spain',
    );
    await user.click(
      screen.getByRole('button', { name: en.analyze.form.submit }),
    );
    await screen.findByText(makeResponse(33).report.summary);
    await waitFor(() => expect(mockAnalyzeFixture).toHaveBeenCalledTimes(1));

    // Push the risk dial to the maximum (aggressive) and re-analyze.
    const slider = screen.getByRole('slider', { name: en.analysis.slider.aria });
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');

    await user.click(
      screen.getByRole('button', { name: en.analyze.form.reanalyze }),
    );

    await waitFor(() => expect(mockAnalyzeFixture).toHaveBeenCalledTimes(2));
    expect(mockAnalyzeFixture.mock.calls[1][0]).toEqual({
      query: 'Portugal vs Spain',
      riskAppetite: 100,
      language: 'en',
    });
    // The aggressive re-run surfaces the higher-variance alternative.
    expect(await screen.findByText(en.analysis.markets.BTTS)).toBeInTheDocument();
  });

  it('renders the AI-estimated disclaimer prominently plus clickable sources', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnalyzeView />);

    await user.type(
      screen.getByLabelText(en.analyze.form.queryLabel),
      'Portugal vs Spain',
    );
    await user.click(
      screen.getByRole('button', { name: en.analyze.form.submit }),
    );

    const response = makeResponse(33);

    // The disclaimer is present and visible (server text + framing + provenance).
    const disclaimer = await screen.findByText(response.disclaimer);
    expect(disclaimer).toBeVisible();
    expect(screen.getByText(en.analyze.result.disclaimerEyebrow)).toBeInTheDocument();
    expect(
      screen.getByText(en.analyze.result.provenanceValue, { exact: false }),
    ).toBeInTheDocument();
    // Responsible-gambling warning renders alongside it.
    expect(
      screen.getByText(response.report.responsibleGamblingWarning),
    ).toBeInTheDocument();

    // Sources render, with the URL source as a real, safe external link.
    expect(screen.getByText(en.analyze.result.sourcesEyebrow)).toBeInTheDocument();
    const link = screen.getByRole('link', {
      name: /Portugal recent results/,
    });
    expect(link).toHaveAttribute('href', 'https://example.com/portugal-form');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    // The provider label for the URL-less source is still shown.
    expect(screen.getByText('Marca')).toBeInTheDocument();
  });

  it('sends the chosen report language to the server', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnalyzeView />);

    await user.type(
      screen.getByLabelText(en.analyze.form.queryLabel),
      'Portugal vs Spain',
    );
    // Switch the report language toggle to Spanish (does NOT change the app locale).
    fireEvent.change(screen.getByLabelText(en.analyze.form.languageLabel), {
      target: { value: 'es' },
    });
    await user.click(
      screen.getByRole('button', { name: en.analyze.form.submit }),
    );

    await waitFor(() => expect(mockAnalyzeFixture).toHaveBeenCalledTimes(1));
    expect(mockAnalyzeFixture.mock.calls[0][0].language).toBe('es');
  });

  it('renders the analyze UI copy from the active catalog (en vs es)', () => {
    const { unmount } = renderWithProviders(<AnalyzeView />, {
      locale: 'en',
      messages: en,
    });
    expect(screen.getByText(en.analyze.page.title)).toBeInTheDocument();
    expect(
      screen.queryByText(esMessages.analyze.page.subtitle),
    ).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<AnalyzeView />, { locale: 'es', messages: esMessages });
    expect(screen.getByText(esMessages.analyze.page.subtitle)).toBeInTheDocument();
    // English copy must not survive the switch — proves no hardcoded strings.
    expect(screen.queryByText(en.analyze.page.subtitle)).not.toBeInTheDocument();
  });

  it('has no detectable a11y violations in its idle state', async () => {
    const { container } = renderWithProviders(<AnalyzeView />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
