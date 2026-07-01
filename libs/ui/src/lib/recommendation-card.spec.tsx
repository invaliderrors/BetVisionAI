import { render, screen } from '@testing-library/react';
import { RecommendationCard } from './recommendation-card';

describe('RecommendationCard', () => {
  it('renders caller-supplied title, selection and metrics (no embedded copy)', () => {
    render(
      <RecommendationCard
        title="Both teams to score"
        selection="Yes"
        metrics={[
          { key: 'edge', label: 'Edge', value: '4.2%' },
          { key: 'ev', label: 'EV', value: '+0.08' },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Both teams to score' })).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('4.2%')).toBeInTheDocument();
    expect(screen.getByText('+0.08')).toBeInTheDocument();
  });

  it('flags the best bet with a data attribute + badge, and renders the risk slot', () => {
    const { container } = render(
      <RecommendationCard
        title="1X2"
        selection="Home"
        isBestBet
        bestBetLabel="Best bet"
        metrics={[]}
        riskSlot={<span>RISK-LOW</span>}
      />,
    );
    expect(container.querySelector('[data-best-bet="true"]')).not.toBeNull();
    expect(screen.getByText('Best bet')).toBeInTheDocument();
    expect(screen.getByText('RISK-LOW')).toBeInTheDocument();
  });

  it('omits the best-bet badge when not the top pick', () => {
    render(
      <RecommendationCard title="1X2" selection="Draw" metrics={[]} bestBetLabel="Best bet" />,
    );
    expect(screen.queryByText('Best bet')).not.toBeInTheDocument();
  });
});
