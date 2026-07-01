'use client';
// apps/web/src/components/risk-appetite-slider.tsx
// App wrapper around the libs/ui RiskSlider: supplies the localized bucket labels + descriptions
// and the aria-valuetext pattern from the message catalog. The presentational slider stays copy-
// free; this component owns i18n (Feature Spec A).
import { useTranslations } from 'next-intl';
import { RiskSlider, type RiskBucket, type RiskSliderBucketCopy } from '@betvision/ui';

const BUCKETS: readonly RiskBucket[] = ['conservative', 'balanced', 'aggressive'];

export interface RiskAppetiteSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function RiskAppetiteSlider({
  value,
  onChange,
  disabled,
  className,
}: RiskAppetiteSliderProps) {
  const t = useTranslations('analysis.slider');

  const buckets = Object.fromEntries(
    BUCKETS.map((bucket) => [
      bucket,
      {
        label: t(`buckets.${bucket}.label`),
        description: t(`buckets.${bucket}.description`),
      },
    ]),
  ) as Record<RiskBucket, RiskSliderBucketCopy>;

  return (
    <RiskSlider
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
      label={t('label')}
      ariaLabel={t('aria')}
      buckets={buckets}
      formatValueText={(v, bucketLabel, max) =>
        t('valueText', { value: v, max, bucket: bucketLabel })
      }
    />
  );
}
