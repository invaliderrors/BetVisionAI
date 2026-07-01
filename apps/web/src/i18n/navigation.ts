// apps/web/src/i18n/navigation.ts
// Locale-aware navigation helpers. Use these (not next/link, next/navigation) so every link
// and redirect keeps the active locale prefix.
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
