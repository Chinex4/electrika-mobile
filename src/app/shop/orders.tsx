import { router, Stack } from 'expo-router';

import { Between, Button, Card, Empty, Failed, Heading, icons, Loading, Pill, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { naira, when } from '@/lib/format';
import { useResource } from '@/store/hooks';
import type { Order } from '@/types/api';

export default function MyOrders() {
  const t = useT();
  const q = useResource<{ results: Order[] }>('/shop/orders/');
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('account.orders') }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? (
        <Empty title={t('shop.noOrders')} icon={icons.box} action={<Button title={t('shop.browse')} onPress={() => router.push('/customer/shop')} />} />
      ) : null}
      {q.data?.results.map((o) => (
        <Card key={o.id} onPress={() => router.push(`/shop/order/${o.token}`)}>
          <Between>
            <Heading>{o.number}</Heading>
            <Pill label={o.status_label} tone={o.is_open ? 'amber' : 'leaf'} />
          </Between>
          <Small lines={1}>{[naira(o.total), o.summary, when(o.created_at)].join(' · ')}</Small>
        </Card>
      ))}
    </Screen>
  );
}
