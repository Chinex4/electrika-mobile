import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { Between, Card, Empty, Failed, Heading, icons, Loading, Pill, Screen, Segmented, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { when } from '@/lib/format';
import { useResource } from '@/store/hooks';

type Row = { client: { id: number; name: string; origin_label: string; created_at: string }; site: { name: string; area_label: string } | null; state: string; state_label: string; files: number };

export default function Quotes() {
  const t = useT();
  const [show, setShow] = useState<'open' | 'done' | 'all'>('open');
  const q = useResource<{ results: Row[]; counts: { open: number; done: number } }>(`/office/quotes/?show=${show}`);
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('am.quotes') }} />
      <Segmented value={show} onChange={setShow} options={[{ key: 'open', label: t('orders.open'), count: q.data?.counts.open }, { key: 'done', label: t('orders.done') }, { key: 'all', label: t('common.all') }]} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('quotes.none')} icon={icons.quote} /> : null}
      {q.data?.results.map((r) => (
        <Card key={r.client.id} onPress={() => router.push(`/office/quote/${r.client.id}`)} tone={r.state === 'waiting' ? 'amber' : undefined}>
          <Between>
            <Heading className="flex-1" lines={1}>{r.client.name}</Heading>
            <Pill label={r.state_label} tone={r.state === 'waiting' ? 'amber' : r.state === 'closed' ? 'grey' : 'leaf'} />
          </Between>
          <Small>{[r.client.origin_label, r.site?.name, r.files ? t('quotes.files', { n: r.files }) : '', when(r.client.created_at)].filter(Boolean).join(' · ')}</Small>
        </Card>
      ))}
    </Screen>
  );
}
