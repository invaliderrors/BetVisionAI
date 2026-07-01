import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { RequireAuth } from '../../../components/require-auth';
import { DashboardHeader } from '../../../components/dashboard-header';
import { RgFooter } from '../../../components/rg-footer';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RequireAuth>
      <div className="flex min-h-dvh flex-col">
        <DashboardHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <RgFooter />
      </div>
    </RequireAuth>
  );
}
