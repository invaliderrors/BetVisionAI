import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import type { MatchSearchResponse } from '@betvision/contracts';
import { renderWithProviders, enMessages as en } from '../test/test-utils';

const mockSearchMatches = jest.fn<Promise<MatchSearchResponse>, [string, string?]>();

jest.mock('../lib/api', () => ({
  __esModule: true,
  matchesApi: {
    searchMatches: (...args: [string, string?]) => mockSearchMatches(...args),
  },
}));

jest.mock('../i18n/navigation', () => ({
  __esModule: true,
  Link: ({ children }: { children?: ReactNode }) => children,
}));

import { MatchSearchView } from './match-search-view';

const CANDIDATES: MatchSearchResponse = {
  query: 'real madrid',
  candidates: [
    {
      matchId: 'm1',
      home: { id: 't1', name: 'Real Madrid', shortName: 'RMA', crestUrl: null },
      away: { id: 't2', name: 'Barcelona', shortName: 'BAR', crestUrl: null },
      competition: { id: 'c1', name: 'La Liga', country: 'ES' },
      kickoffUtc: '2026-05-01T19:00:00.000Z',
      status: 'scheduled',
      confidence: 0.92,
    },
  ],
  suggestions: [],
};

const NO_MATCH: MatchSearchResponse = {
  query: 'zzzz',
  candidates: [],
  suggestions: ['Real Madrid', 'Real Sociedad'],
};

describe('MatchSearchView', () => {
  beforeEach(() => mockSearchMatches.mockReset());

  it('renders ranked candidates with disambiguation + a match-confidence reading', async () => {
    mockSearchMatches.mockResolvedValue(CANDIDATES);
    const user = userEvent.setup();
    renderWithProviders(<MatchSearchView />);

    await user.type(screen.getByLabelText(en.analysis.search.label), 'real madrid');

    expect(await screen.findByText('Real Madrid')).toBeInTheDocument();
    expect(screen.getByText('Barcelona')).toBeInTheDocument();
    // Disambiguation: competition + kick-off are shown.
    expect(screen.getByText(/La Liga/)).toBeInTheDocument();
    // Confidence is surfaced as a calibrated meter.
    expect(
      screen.getByRole('meter', { name: en.analysis.search.confidenceAria }),
    ).toBeInTheDocument();
  });

  it('shows the NO_MATCH state with the resolver suggestions', async () => {
    mockSearchMatches.mockResolvedValue(NO_MATCH);
    const user = userEvent.setup();
    renderWithProviders(<MatchSearchView />);

    await user.type(screen.getByLabelText(en.analysis.search.label), 'zzzz');

    expect(await screen.findByText(en.analysis.search.noMatch.title)).toBeInTheDocument();
    expect(
      screen.getByText(en.analysis.search.noMatch.suggestionsLabel),
    ).toBeInTheDocument();
    expect(screen.getByText('Real Sociedad')).toBeInTheDocument();
  });
});
