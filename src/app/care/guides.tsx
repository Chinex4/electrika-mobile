import { router, Stack } from 'expo-router';

import { Card, Empty, Failed, Heading, icons, Loading, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { useResource } from '@/store/hooks';

type Guides = { visible: boolean; results: { slug: string; title: string; summary: string; minutes: number | null }[] };

export default function GuidesScreen() {
  const t = useT();
  const q = useResource<Guides>('/care/guides/');
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('care.guides') }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.visible ? <Empty title={t('care.guidesPlan')} icon={icons.book} /> : null}
      {q.data?.results.map((g) => (
        <Card key={g.slug} onPress={() => router.push(`/care/guide/${g.slug}`)}>
          <Heading>{g.title}</Heading>
          <Small>{g.summary}</Small>
          {g.minutes ? <Small>{t('care.minutes', { n: g.minutes })}</Small> : null}
        </Card>
      ))}
    </Screen>
  );
}
