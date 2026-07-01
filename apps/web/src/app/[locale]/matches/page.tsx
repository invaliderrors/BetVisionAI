import { setRequestLocale } from 'next-intl/server';
import { MatchSearchView } from '../../../components/match-search-view';

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MatchSearchView />;
}
