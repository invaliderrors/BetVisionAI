'use client';
// apps/web/src/components/dashboard-header.tsx
// Authenticated app header: brand, primary nav, language switcher, and the user menu (email +
// sign out). All copy via next-intl; the nav marks the active route with aria-current.
import { useLocale, useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { Button } from '@betvision/ui';
import { Link, usePathname, useRouter } from '../i18n/navigation';
import { useAuthStore } from '../lib/auth/auth-store';
import { HeaderLanguageSwitcher } from './header-language-switcher';
import { BrandMark } from './brand-mark';

export function DashboardHeader() {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const tMenu = useTranslations('userMenu');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const navItems = [{ href: '/dashboard', label: tNav('dashboard') }] as const;

  async function handleSignOut() {
    await logout(locale);
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/dashboard" className="shrink-0">
          <BrandMark />
        </Link>

        <nav aria-label={tNav('dashboard')} className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  'rounded-md px-3 py-1.5 text-sm transition-colors ' +
                  (active
                    ? 'bg-fg/5 text-fg'
                    : 'text-muted hover:text-fg')
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <HeaderLanguageSwitcher />
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-right md:block">
                <span className="block font-mono text-eyebrow uppercase tracking-[0.14em] text-muted">
                  {tMenu('signedInAs')}
                </span>
                <span className="block max-w-[16rem] truncate text-xs text-fg">
                  {user.email}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                leadingIcon={<LogOut aria-hidden="true" className="h-3.5 w-3.5" />}
              >
                {tCommon('signOut')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
