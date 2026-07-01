import { setRequestLocale } from 'next-intl/server';
import { MatchAnalysisView } from '../../../../components/match-analysis-view';

export default async function MatchAnalysisPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <MatchAnalysisView matchId={id} />;
}
