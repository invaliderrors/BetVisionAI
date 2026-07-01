// libs/ui/src/lib/confidence-bar.spec.tsx
import { render, screen } from '@testing-library/react';
import { ConfidenceBar } from './confidence-bar';

describe('ConfidenceBar', () => {
  it('renders an accessible meter with calibrated 0–100 bounds', () => {
    render(
      <ConfidenceBar value={62} label="Confidence" ariaLabel="Model confidence" />,
    );
    const meter = screen.getByRole('meter', { name: 'Model confidence' });
    expect(meter).toHaveAttribute('aria-valuenow', '62');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps out-of-range values instead of overflowing the scale', () => {
    render(
      <ConfidenceBar value={140} label="Confidence" ariaLabel="Model confidence" />,
    );
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
  });

  it('uses the caller-provided formatter for the numeric readout', () => {
    render(
      <ConfidenceBar
        value={62.4}
        label="Confidence"
        ariaLabel="Model confidence"
        format={(v) => `${v.toFixed(1)} pct`}
      />,
    );
    expect(screen.getByText('62.4 pct')).toBeInTheDocument();
  });
});
