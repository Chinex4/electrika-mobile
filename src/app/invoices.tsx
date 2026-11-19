import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Text } from 'react-native';

import { Banner, Between, Button, Card, Empty, Failed, Heading, icons, KeyValue, Loading, Pill, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { day, naira } from '@/lib/format';
import { openCheckout } from '@/lib/pay';
import { notify } from '@/lib/toast';
import { useAction, useResource } from '@/store/hooks';

type Invoice = { id: number; amount: string; sla_credit_total: string; status: string; status_label: string; issue_date: string; due_date: string; paid_at: string | null; payment_method: string; plan: string; can_pay_online: boolean };
type Invoices = { online_payment: boolean; bank_transfer: Record<string, string> | null; results: Invoice[] };

/** The plan's invoices: pay online with Paystack, or see the bank details for a transfer. */
export default function InvoicesScreen() {
  const t = useT();
  const q = useResource<Invoices>('/customer/invoices/');
  const { run } = useAction();
  const [paying, setPaying] = useState<number | null>(null);

  async function pay(inv: Invoice) {
    setPaying(inv.id);
    try {
      const res = await run<{ checkout_url: string }>(`/customer/invoices/${inv.id}/pay/`, { success: false });
      const result = await openCheckout(res.checkout_url);
      if (result === 'paid') notify.success(t('pay.paid'));
      else if (result === 'failed') notify.error(t('pay.failed'));
      else if (result === 'pending') notify.info(t('pay.notYet'));
      q.refetch();
    } catch {
      // toast shown
    } finally {
      setPaying(null);
    }
  }

  const bank = q.data?.bank_transfer;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('account.invoices') }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('invoices.noneCustomer')} icon={icons.doc} /> : null}
      {q.data?.results.map((i) => {
        const owing = i.status !== 'PAID' && i.status !== 'CANCELLED';
        return (
          <Card key={i.id} tone={i.status === 'OVERDUE' ? 'alert' : undefined}>
            <Between>
              <Heading>{`INV-${String(i.id).padStart(4, '0')}`}</Heading>
              <Pill label={i.status_label} tone={i.status === 'PAID' ? 'leaf' : i.status === 'OVERDUE' ? 'alert' : 'amber'} />
            </Between>
            <Text className="text-[24px] font-bold text-navy">{naira(i.amount)}</Text>
            <Small>{[i.plan, i.paid_at ? t('invoices.paidOn', { day: day(i.paid_at) }) : t('money.due', { day: day(i.due_date) })].join(' · ')}</Small>
            {Number(i.sla_credit_total) ? <KeyValue label={t('confirm.credit')} value={`− ${naira(i.sla_credit_total)}`} /> : null}
            {owing && i.can_pay_online ? <Button title={t('invoices.payNow')} icon={icons.card} busy={paying === i.id} onPress={() => pay(i)} /> : null}
          </Card>
        );
      })}
      {bank && Object.keys(bank).length ? (
        <Card>
          <Heading>{t('invoices.bank')}</Heading>
          {Object.entries(bank).map(([k, v]) => (
            <KeyValue key={k} label={t(`invoices.field.${k}`)} value={String(v)} />
          ))}
          {bank.account_number ? (
            <Button size="sm" variant="soft" title={t('invoices.copy')} icon={icons.doc} onPress={async () => { await Clipboard.setStringAsync(String(bank.account_number)); notify.success(t('invoices.copied')); }} />
          ) : null}
          <Small>{t('invoices.bankSub')}</Small>
        </Card>
      ) : null}
      {q.data && !q.data.online_payment ? <Banner tone="info">{t('invoices.onlineOff')}</Banner> : null}
    </Screen>
  );
}
