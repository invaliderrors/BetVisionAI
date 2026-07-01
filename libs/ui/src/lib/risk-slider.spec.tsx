import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { RiskSlider, type RiskSliderBucketCopy } from './risk-slider';
import { riskBucketOf, RISK_BUCKET_BOUNDS, type RiskBucket } from './risk-bucket';

expect.extend(toHaveNoViolations);

const BUCKETS: Record<RiskBucket, RiskSliderBucketCopy> = {
  conservative: { label: 'Conservative', description: 'Demands a bigger edge.' },
  balanced: { label: 'Balanced', description: 'A measured middle ground.' },
  aggressive: { label: 'Aggressive', description: 'Accepts more variance.' },
};

/** Controlled harness so aria-valuenow / valuetext reflect committed changes, like the app. */
function Harness({ initial = 33 }: { initial?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <RiskSlider
      value={value}
      onChange={setValue}
      label="Risk appetite"
      ariaLabel="Risk appetite, 0 to 100"
      buckets={BUCKETS}
      formatValueText={(v, bucketLabel, max) => `${v} of ${max}, ${bucketLabel}`}
    />
  );
}

function getSlider() {
  return screen.getByRole('slider', { name: 'Risk appetite, 0 to 100' });
}

describe('riskBucketOf (Feature Spec B boundaries)', () => {
  it('splits 0..100 into conservative / balanced / aggressive at 33 and 66', () => {
    expect(riskBucketOf(0)).toBe('conservative');
    expect(riskBucketOf(RISK_BUCKET_BOUNDS.conservative)).toBe('conservative'); // 33
    expect(riskBucketOf(34)).toBe('balanced');
    expect(riskBucketOf(RISK_BUCKET_BOUNDS.balanced)).toBe('balanced'); // 66
    expect(riskBucketOf(67)).toBe('aggressive');
    expect(riskBucketOf(100)).toBe('aggressive');
  });
});

describe('RiskSlider ARIA', () => {
  it('exposes a calibrated 0..100 slider with the default value + valuetext', () => {
    render(<Harness />);
    const slider = getSlider();
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '33');
    expect(slider).toHaveAttribute('aria-valuetext', '33 of 100, Conservative');
    // The live bucket label + one-line description are shown.
    expect(screen.getByTestId('risk-bucket')).toHaveTextContent('Conservative');
    expect(screen.getByText('Demands a bigger edge.')).toBeInTheDocument();
  });

  it('is keyboard focusable', () => {
    render(<Harness />);
    expect(getSlider()).toHaveAttribute('tabindex', '0');
  });
});

describe('RiskSlider keyboard control', () => {
  it('ArrowRight increments the value and flips the bucket at the boundary', () => {
    render(<Harness initial={33} />);
    const slider = getSlider();

    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    expect(slider).toHaveAttribute('aria-valuenow', '34');
    expect(slider).toHaveAttribute('aria-valuetext', '34 of 100, Balanced');
    expect(slider).toHaveAttribute('data-bucket', 'balanced');
    expect(screen.getByTestId('risk-bucket')).toHaveTextContent('Balanced');
    expect(screen.getByText('A measured middle ground.')).toBeInTheDocument();
  });

  it('ArrowLeft / ArrowDown / ArrowUp step by one', () => {
    render(<Harness initial={50} />);
    const slider = getSlider();

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '49');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(slider).toHaveAttribute('aria-valuenow', '49');
  });

  it('PageUp / PageDown jump by the large step (10)', () => {
    render(<Harness initial={50} />);
    const slider = getSlider();

    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '60');
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('Home / End jump to the bounds and their buckets', () => {
    render(<Harness initial={33} />);
    const slider = getSlider();

    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');
    expect(slider).toHaveAttribute('data-bucket', 'aggressive');
    expect(screen.getByTestId('risk-bucket')).toHaveTextContent('Aggressive');

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(slider).toHaveAttribute('data-bucket', 'conservative');
  });

  it('does not step below min or above max', () => {
    render(<Harness initial={0} />);
    const slider = getSlider();
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    fireEvent.keyDown(slider, { key: 'End' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('reports each committed value through onChange', () => {
    const onChange = jest.fn();
    render(
      <RiskSlider
        value={33}
        onChange={onChange}
        label="Risk appetite"
        ariaLabel="Risk appetite, 0 to 100"
        buckets={BUCKETS}
      />,
    );
    fireEvent.keyDown(getSlider(), { key: 'PageUp' });
    expect(onChange).toHaveBeenCalledWith(43);
  });
});

describe('RiskSlider accessibility', () => {
  it('has no detectable a11y violations', async () => {
    const { container } = render(<Harness />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
