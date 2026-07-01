'use client';
// apps/web/src/components/header-language-switcher.tsx
// Wraps the libs/ui LanguageSwitcher primitive with app behaviour: switch the /[locale]/ route
// (next-intl also persists the NEXT_LOCALE cookie), and — when authenticated — persist the
// choice to the account via PATCH /users/me { locale }.
import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@betvision/ui';
import { usePathname, useRouter } from '../i18n/navigation';
import { routing } from '../i18n/routing';
import { useAuthStore } from '../lib/auth/auth-store';
import { usersApi } from '../lib/api';

export function HeaderLanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const user = useAuthStore((s) => s.user);
  const setUserLocale = useAuthStore((s) => s.setUserLocale);

  const options = routing.locales.map((l) => ({
    value: l,
    label: t(`localeName.${l}`),
  }));

  function handleChange(next: string) {
    if (next === locale) return;
    const nextLocale = next as (typeof routing.locales)[number];

    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });

    if (user) {
      setUserLocale(nextLocale);
      // Best-effort persistence; the route + cookie change already applied.
      usersApi.updateLocale(nextLocale, nextLocale).catch(() => undefined);
    }
  }

  return (
    <LanguageSwitcher
      options={options}
      value={locale}
      onChange={handleChange}
      ariaLabel={t('common.language')}
      disabled={pending}
    />
  );
}
