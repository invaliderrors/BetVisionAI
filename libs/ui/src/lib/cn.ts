// libs/ui/src/lib/cn.ts
// Tiny class-name combiner. Keeps conditional Tailwind classes readable without pulling
// heavier utilities into the design-system layer.
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export type { ClassValue };
