import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Banner, Button, Card, Failed, Field, Heading, icons, KeyValue, Loading, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { naira } from '@/lib/format';
import { notify } from '@/lib/toast';
import { useDraft } from '@/lib/useDraft';
import { useAction, useResource } from '@/store/hooks';
import type { ApiFailure } from '@/types/api';

type Target = { kind: 'invoice' | 'order'; title: string; sub: string; ref: string; amount: string; credit: string; open: boolean };

/** Confirming a bank transfer against an invoice or Shop order, as Accounts does on the website. */
export default function Confirm() {
  const t = useT();
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const q = useResource<Target>(`/office/accounts/confirm/${kind}/${id}/`);
  const x = q.data;
  const { run, busy } = useAction();
  const [amount, setAmount] = useDraft(x ? String(Math.round(Number(x.amount) - Number(x.credit || 0))) : '', x?.ref);
  const [note, setNote] = useState('');

  async function send(action: 'confirm' | 'mismatch') {
    try {
      const res = await run<{ level: string; detail: string }>(`/office/accounts/confirm/${kind}/${id}/`, {
        body: { action, amount, note },
        success: false,
        invalidate: ['/office/accounts/', '/office/orders/', '/office/summary/'],
      });
      if (res.level === 'warning') notify.warning(res.detail);
      else if (res.level === 'info') notify.info(res.detail);
      else notify.success(res.detail);
      router.back();
    } catch {
      // toast shown
    }
  }

  async function remind() {
    await run(`/office/accounts/invoices/${id}/remind/`, { invalidate: ['/office/accounts/'] }).catch((e: ApiFailure) => e);
  }

  if (!x) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  return (
    <Screen
      footer={
        x.open ? (
          <View className="gap-2">
            <Button title={t('confirm.received')} variant="success" icon={icons.check} busy={busy} onPress={() => send('confirm')} />
            <Button title={t('confirm.mismatch')} variant="secondary" onPress={() => send('mismatch')} />
          </View>
        ) : null
      }>
      <Stack.Screen options={{ title: x.ref }} />
      <Card>
        <Small>{x.sub}</Small>
        <Heading>{x.title}</Heading>
        <Text className="text-[30px] font-extrabold text-navy">{naira(x.amount)}</Text>
        {Number(x.credit) ? <KeyValue label={t('confirm.credit')} value={`− ${naira(x.credit)}`} /> : null}
      </Card>
      {!x.open ? <Banner tone="leaf">{t('confirm.notWaiting')}</Banner> : null}
      {x.open ? (
        <>
          <Field label={t('confirm.amount')} placeholder={t('ph.confirm.amount')} value={amount} onChangeText={setAmount} keyboardType="number-pad" hint={t('confirm.amountHint')} />
          <Field label={t('confirm.note')} placeholder={t('ph.confirm.note')} value={note} onChangeText={setNote} multiline hint={t('confirm.noteHint')} />
          {x.kind === 'invoice' ? <Button title={t('confirm.remind')} variant="ghost" icon={icons.bell} onPress={remind} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
