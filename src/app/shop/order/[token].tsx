import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Banner, Between, Button, Card, Divider, Failed, Heading, icons, KeyValue, Loading, Pill, Progress, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { naira, when } from '@/lib/format';
import { openCheckout } from '@/lib/pay';
import { notify } from '@/lib/toast';
import { useAction, useResource } from '@/store/hooks';
import type { Order } from '@/types/api';

/** Where a Shop order stands, and paying for it if it's waiting. */
export default function OrderScreen() {
  const t = useT();
  const { token } = useLocalSearchParams<{ token: string }>();
  const path = `/shop/orders/${token}/`;
  const q = useResource<Order>(path, { auth: false, poll: 60_000 });
  const { run, busy } = useAction();
  const o = q.data;
  const steps = (o?.progress ?? []).map((s) => (typeof s === 'string' ? s : s.label));
  const current = (o?.progress ?? []).filter((s) => typeof s !== 'string' && s.done).length;

  async function pay() {
    try {
      const res = await run<{ checkout_url: string }>(`/shop/orders/${token}/pay/`, { auth: false, success: false });
      const result = await openCheckout(res.checkout_url);
      if (result === 'paid') notify.success(t('pay.paid'));
      else if (result === 'failed') notify.error(t('pay.failed'));
      q.refetch();
    } catch {
      // shown as a toast
    }
  }

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch} footer={o?.can_pay ? <Button title={t('shop.payAmount', { amount: naira(o.total) })} icon={icons.card} busy={busy} onPress={pay} /> : null}>
      <Stack.Screen options={{ title: o ? o.number : t('shop.order') }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !o ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {o ? (
        <>
          <Card>
            <Between>
              <Text className="text-[22px] font-bold text-navy">{o.number}</Text>
              <Pill label={o.status_label} tone={o.is_open ? 'amber' : 'leaf'} />
            </Between>
            <Small>{when(o.created_at)} · {o.method_label} · {o.payment_label}</Small>
          </Card>
          {o.status === 'AWAITING_PAYMENT' && o.payment === 'TRANSFER' ? <Banner tone="amber" title={t('shop.transferTitle')}>{t('shop.transferSub', { n: o.number })}</Banner> : null}
          {steps.length ? (
            <Card>
              <Heading>{t('shop.progress')}</Heading>
              <Progress steps={steps} current={current} />
            </Card>
          ) : null}
          <Card>
            <Heading>{t('shop.items')}</Heading>
            {o.items.map((i, n) => (
              <KeyValue key={n} label={`${i.quantity} × ${i.name}`} value={naira(Number(i.unit_price) * i.quantity)} />
            ))}
            <Divider />
            <KeyValue label={t('shop.subtotal')} value={naira(o.items_total)} />
            {o.method === 'DELIVER' ? <KeyValue label={t('shop.delivery')} value={naira(o.delivery_fee)} /> : null}
            <KeyValue label={t('shop.total')} value={naira(o.total)} strong />
          </Card>
          {o.method === 'DELIVER' ? (
            <Card>
              <Heading>{t('shop.deliverTo')}</Heading>
              <Small>{[o.address, o.landmark].filter(Boolean).join(' · ')}</Small>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
