import { setRequestLocale } from 'next-intl/server';
import { DashboardView } from '../../../components/dashboard-view';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashboardView />;
}
