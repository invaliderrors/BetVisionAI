// libs/ui/src/lib/input.tsx
// Labelled text input with accessible error wiring. Labels/errors are passed in as copy.
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label copy (already localized by the caller). */
  label: ReactNode;
  /** Error message copy; when set the field is marked invalid and described by it. */
  error?: ReactNode;
  /** Optional helper/hint copy shown when there is no error. */
  hint?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedById = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="font-mono text-eyebrow uppercase tracking-[0.16em] text-muted"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={cn(
          'h-10 rounded-md border bg-bg/40 px-3 text-sm text-fg placeholder:text-muted/60',
          'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
          error ? 'border-risk-high' : 'border-line focus-visible:border-signal/50',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-risk-high">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
