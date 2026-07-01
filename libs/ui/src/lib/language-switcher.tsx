// libs/ui/src/lib/language-switcher.tsx
// Presentational language switcher primitive. Holds no locale logic and no embedded copy:
// the caller supplies the option labels, the current value, the accessible label, and the
// change handler. Rendered as a native <select> for keyboard + screen-reader support.
import { useId } from 'react';
import { Globe } from 'lucide-react';
import { cn } from './cn';

export interface LanguageOption {
  value: string;
  /** Localized display name for the language (e.g. "English", "Español"). */
  label: string;
}

export interface LanguageSwitcherProps {
  options: LanguageOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible label for the control (localized), e.g. t('common.language'). */
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

export function LanguageSwitcher({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  className,
}: LanguageSwitcherProps) {
  const id = useId();
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <Globe
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted"
      />
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 appearance-none rounded-md border border-line bg-surface pl-7 pr-7 text-xs text-fg',
          'font-mono uppercase tracking-[0.12em] transition-colors duration-150',
          'hover:border-signal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface text-fg">
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-2.5 h-2.5 w-2.5 text-muted"
      >
        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}
