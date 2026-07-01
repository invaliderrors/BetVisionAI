// apps/web/src/components/public-header.tsx
// Header for unauthenticated / marketing screens: brand, language switcher, and auth links.
import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';
import { HeaderLanguageSwitcher } from './header-language-switcher';
import { BrandMark } from './brand-mark';

export function PublicHeader() {
  const t = useTranslations('common');
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/">
          <BrandMark />
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <HeaderLanguageSwitcher />
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-fg"
          >
            {t('signIn')}
          </Link>
        </div>
      </div>
    </header>
  );
}
