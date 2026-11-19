import { router, Stack } from 'expo-router';

import { Between, Card, Empty, Failed, Heading, icons, Loading, Pill, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { when } from '@/lib/format';
import { useResource } from '@/store/hooks';
import type { Choice, Person } from '@/types/api';

type Partner = { id: number; name: string; contact_name: string; partner_stage: string; account_manager: Person | null; created_at: string };

export default function Partners() {
  const t = useT();
  const q = useResource<{ results: Partner[]; stages: Choice[] }>('/office/partners/');
  const stage = (k: string) => q.data?.stages.find((s) => s.key === k)?.label ?? k;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('am.partners') }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('partners.none')} icon={icons.handshake} /> : null}
      {q.data?.results.map((p) => (
        <Card key={p.id} onPress={() => router.push(`/office/partner/${p.id}`)}>
          <Between>
            <Heading className="flex-1" lines={1}>{p.name}</Heading>
            <Pill label={stage(p.partner_stage)} tone="brand" />
          </Between>
          <Small>{[p.contact_name, p.account_manager?.name ?? t('requests.notTaken'), when(p.created_at)].filter(Boolean).join(' · ')}</Small>
        </Card>
      ))}
    </Screen>
  );
}
