import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Banner, Between, Button, Card, ConfirmSheet, Divider, Failed, Field, Heading, icons, KeyValue, Loading, Pill, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { naira, when } from '@/lib/format';
import { call } from '@/lib/pay';
import { useDraft } from '@/lib/useDraft';
import { useAction, useResource } from '@/store/hooks';
import type { StaffOrder } from '@/types/api';

/** A Shop order, for the office: move it on, mark a transfer paid, add a note, cancel. */
export default function OfficeOrder() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = `/office/orders/${id}/`;
  const q = useResource<StaffOrder>(path);
  const o = q.data;
  const { run, busy } = useAction();
  const [note, setNote] = useDraft(o?.staff_note ?? '', o?.staff_note);
  const [cancelling, setCancelling] = useState(false);
  const act = (body: Record<string, unknown>) => run(path, { body, invalidate: ['/office/', '/shop/'] }).catch(() => undefined);

  if (!o) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: o.number }} />
      <Card>
        <Between>
          <Text className="text-[22px] font-bold text-navy">{naira(o.total)}</Text>
          <Pill label={o.status_label} tone={o.is_open ? 'amber' : 'leaf'} />
        </Between>
        <Small>{[o.method_label, o.payment_label, when(o.created_at)].join(' · ')}</Small>
      </Card>
      {o.next_steps.length || o.status === 'AWAITING_PAYMENT' ? (
        <Card>
          <Heading>{t('orders.nextStep')}</Heading>
          {o.status === 'AWAITING_PAYMENT' && o.payment === 'TRANSFER' ? <Button title={t('orders.markPaid')} variant="success" icon={icons.money} busy={busy} onPress={() => act({ action: 'paid' })} /> : null}
          {o.next_steps.map((s) => (
            <Button key={s.key} title={s.label} variant="soft" busy={busy} onPress={() => act({ action: s.key })} />
          ))}
        </Card>
      ) : null}
      <Card>
        <Heading>{o.customer.name}</Heading>
        <KeyValue label={t('auth.phone')} value={o.customer.phone} />
        <KeyValue label={t('auth.emailRequired')} value={o.customer.email} />
        {o.method === 'DELIVER' ? <KeyValue label={t('shop.deliverTo')} value={[o.address, o.landmark].filter(Boolean).join(' · ')} /> : null}
        {o.customer.phone ? <Button size="sm" variant="soft" title={t('common.call')} icon={icons.phone} onPress={() => call(o.customer.phone)} /> : null}
      </Card>
      <Card>
        <Heading>{t('shop.items')}</Heading>
        {o.items.map((i, n) => (
          <KeyValue key={n} label={`${i.quantity} × ${i.name}`} value={naira(Number(i.unit_price) * i.quantity)} />
        ))}
        <Divider />
        <KeyValue label={t('shop.delivery')} value={naira(o.delivery_fee)} />
        <KeyValue label={t('shop.total')} value={naira(o.total)} strong />
        {o.fitting ? <Pill label={t('orders.withFitting')} tone="brand" /> : null}
      </Card>
      <Field label={t('orders.staffNote')} placeholder={t('ph.orders.staffNote')} value={note} onChangeText={setNote} multiline />
      <View className="flex-row gap-2">
        <Button className="flex-1" title={t('orders.saveNote')} variant="secondary" disabled={note === o.staff_note} onPress={() => act({ action: 'note', staff_note: note })} />
        {o.can_cancel ? <Button title={t('orders.cancel')} variant="ghost" onPress={() => setCancelling(true)} /> : null}
      </View>
      {o.fitting_job_id ? <Banner tone="info">{t('orders.fittingJob', { id: o.fitting_job_id })}</Banner> : null}
      <ConfirmSheet open={cancelling} onClose={() => setCancelling(false)} title={t('orders.cancelTitle', { n: o.number })} message={t('orders.cancelSub')} confirm={t('orders.cancel')} busy={busy}
        onConfirm={async () => {
          await act({ action: 'cancel' });
          setCancelling(false);
        }} />
    </Screen>
  );
}
