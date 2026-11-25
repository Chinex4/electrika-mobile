/** The vendor's plan, other plans, and payments to ElectriKa. */
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { payWith } from '@/components/market';
import { VendorTabs } from '@/components/market/VendorTabs';
import { Banner, Button, Card, Failed, ListGroup, Loading, Pill, Row, Screen, SectionLabel, Segmented, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { day, naira } from '@/lib/format';
import { useAction, useResource } from '@/store/hooks';
import type { Checkout, MyStore, Payment, Plan, Subscription } from '@/types/market';

type PlanPage = { subscription: Subscription | null; plans: Plan[]; usage: { active_listings: number; listing_limit: number | null }; payments: Payment[] };

export default function PlanScreen() {
  const t = useT();
  const q = useResource<PlanPage>('/market/vendor/plan/');
  const store = useResource<{ store: MyStore | null }>('/market/vendor/');
  const { run, busy } = useAction();
  const [billing, setBilling] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const sub = q.data?.subscription;
  const current = sub?.plan;
  const owner = !!store.data?.store?.is_owner;

  const choose = async (plan: Plan) => {
    const res = await run<Checkout & { subscription: Subscription }>('/market/vendor/plan/', {
      body: { plan: plan.code, billing }, success: false, invalidate: ['/market/vendor/'],
    });
    await payWith(res.checkout_url, t);
    q.refetch();
  };
  const pay = async (p: Payment) => {
    const res = await run<Checkout>(`/market/vendor/payments/${p.id}/pay/`, { success: false });
    await payWith(res.checkout_url, t);
    q.refetch();
  };

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: '' }} />
      <Title>{t('mk.planBilling')}</Title>
      <VendorTabs here="plan" />
      {q.isLoading ? <Loading rows={3} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data ? (
        <>
          <Card>
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted">{t('mk.yourPlan')}</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-[18px] font-bold text-navy">{current?.name ?? t('mk.free')}</Text>
              {sub?.trial ? <Pill label={t('mk.trial')} tone="amber" /> : null}
            </View>
            <Text className="text-[13px] text-ink">
              {sub?.ends_at ? (sub.ending ? t('mk.ends', { date: day(sub.ends_at) }) : t('mk.paidUntil', { date: day(sub.ends_at) })) : t('mk.noEnd')}
              {' · '}
              {q.data.usage.active_listings}
              {q.data.usage.listing_limit ? ` ${t('mk.of', { n: q.data.usage.listing_limit })}` : ''} {t('mk.liveListings').toLowerCase()}
            </Text>
            {sub?.ending ? <Text className="text-[12.5px] text-amber-ink">{t('mk.moveDown')}</Text> : null}
          </Card>
          <Text className="text-[12.5px] text-muted">{t('mk.planNote')}</Text>
          {owner ? <Segmented options={[{ key: 'MONTHLY', label: t('mk.monthly') }, { key: 'ANNUAL', label: t('mk.yearly') }]} value={billing} onChange={setBilling} /> : null}
          {q.data.plans.map((p) => {
            const price = billing === 'ANNUAL' ? p.annual_price : p.monthly_price;
            const isCurrent = current?.id === p.id;
            return (
              <Card key={p.id} tone={isCurrent ? 'brand' : undefined}>
                <View className="flex-row items-baseline justify-between">
                  <Text className="text-[16px] font-bold text-navy">{p.name}</Text>
                  <Text className="text-[15px] font-bold text-accent">{p.is_free ? t('mk.free') : naira(price)}</Text>
                </View>
                {p.features.map((f) => <Text key={f} className="text-[13px] text-ink">• {f}</Text>)}
                {owner && !(isCurrent && p.is_free) ? (
                  <Button
                    size="sm"
                    variant={p.is_free ? 'secondary' : 'primary'}
                    busy={busy}
                    title={p.is_free ? (current && !current.is_free ? t('mk.moveWhenEnds', { name: p.name }) : t('mk.switchTo', { name: p.name }))
                      : isCurrent ? t('mk.renew') : p.trial_days ? t('mk.startTrial', { n: p.trial_days }) : t('mk.choosePlan', { name: p.name })}
                    onPress={() => choose(p)}
                  />
                ) : null}
              </Card>
            );
          })}
          <SectionLabel>{t('mk.payments')}</SectionLabel>
          {q.data.payments.length ? (
            <ListGroup>
              {q.data.payments.map((p, i, arr) => (
                <Row key={p.id} title={p.description} sub={`${naira(p.amount)} · ${day(p.created_at)} · ${p.status_label}`} last={i === arr.length - 1}
                  tone={p.status === 'PAID' ? 'leaf' : p.status === 'PENDING' ? 'amber' : 'grey'}
                  right={p.status === 'PENDING' ? <Button title={t('mk.pay')} size="sm" onPress={() => pay(p)} /> : undefined} />
              ))}
            </ListGroup>
          ) : (
            <Text className="text-[13px] text-muted">{t('mk.noPayments')}</Text>
          )}
          {!owner ? <Banner tone="info">{t('mk.teamNote')}</Banner> : null}
        </>
      ) : null}
    </Screen>
  );
}
