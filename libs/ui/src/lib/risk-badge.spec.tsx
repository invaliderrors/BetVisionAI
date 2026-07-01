// libs/ui/src/lib/risk-badge.spec.tsx
import { render, screen } from '@testing-library/react';
import { RiskBadge } from './risk-badge';

describe('RiskBadge', () => {
  it('renders the caller-supplied label (no embedded copy)', () => {
    render(<RiskBadge level="low" label="Conservador" />);
    expect(screen.getByText('Conservador')).toBeInTheDocument();
  });

  it('exposes the level via a data attribute for each risk band', () => {
    const { rerender, container } = render(
      <RiskBadge level="low" label="Low" />,
    );
    expect(container.querySelector('[data-level="low"]')).not.toBeNull();

    rerender(<RiskBadge level="medium" label="Medium" />);
    expect(container.querySelector('[data-level="medium"]')).not.toBeNull();

    rerender(<RiskBadge level="high" label="High" />);
    expect(container.querySelector('[data-level="high"]')).not.toBeNull();
  });

  it('uses a sober, non-celebratory palette (never green) for low risk', () => {
    const { container } = render(<RiskBadge level="low" label="Low" />);
    const badge = container.querySelector('[data-level="low"]');
    // Low risk must read as steel-blue, not a "green = win" cue.
    expect(badge?.className).toContain('text-risk-low');
    expect(badge?.className).not.toMatch(/green|emerald|lime/);
  });
});
