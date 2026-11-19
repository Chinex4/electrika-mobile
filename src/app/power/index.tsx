import { router, Stack } from 'expo-router';

import { Between, Button, Card, Empty, Failed, Heading, icons, Loading, Pill, Screen, Small, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { when } from '@/lib/format';
import { useResource } from '@/store/hooks';
import type { PowerReport } from '@/types/api';

/** Power reports (Voice): problems with the electricity company we follow up for you. */
export default function PowerReports() {
  const t = useT();
  const q = useResource<{ results: PowerReport[] }>('/voice/');
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch} footer={<Button title={t('power.new')} icon={icons.megaphone} onPress={() => router.push('/power/new')} />}>
      <Stack.Screen options={{ title: '' }} />
      <Title sub={t('power.sub')}>{t('home.power')}</Title>
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('power.none')} sub={t('power.noneSub')} icon={icons.megaphone} /> : null}
      {q.data?.results.map((r) => (
        <Card key={r.token} onPress={() => router.push(`/power/${r.token}`)}>
          <Between>
            <Heading className="flex-1">{r.reference}</Heading>
            <Pill label={r.status_label} tone={r.is_open ? 'brand' : 'leaf'} />
          </Between>
          <Small>{[r.kind_label, when(r.created_at)].join(' · ')}</Small>
        </Card>
      ))}
    </Screen>
  );
}
