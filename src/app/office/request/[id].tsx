import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner, Between, Body, Button, Card, Failed, Heading, icons, KeyValue, Loading, OptionCards, Pill, Screen, Sheet, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { day, when } from '@/lib/format';
import { call, whatsapp } from '@/lib/pay';
import type { NewRequest } from '@/screens/staff/Office';
import { useAction, useAppSelector, useResource } from '@/store/hooks';
import { selectRole } from '@/store/selectors';
import type { Choice } from '@/types/api';

/** A new request (a lead): take it, call them, or close it with a reason. */
export default function RequestScreen() {
  const t = useT();
  const role = useAppSelector(selectRole);
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useResource<{ results: NewRequest[]; close_reasons: Choice[] }>('/office/requests/');
  const r = q.data?.results.find((x) => String(x.client.id) === id);
  const { run, busy } = useAction();
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const refresh = ['/office/'];

  if (!q.data) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  if (!r)
    return (
      <Screen>
        <Banner tone="leaf">{t('requests.handled')}</Banner>
      </Screen>
    );
  return (
    <Screen
      footer={
        r.can_take || r.can_close ? (
          <View className="flex-row gap-2">
            {r.can_take ? <Button className="flex-1" title={t('requests.take')} icon={icons.person} busy={busy} onPress={() => run(`/office/requests/${id}/take/`, { invalidate: refresh }).catch(() => undefined)} /> : null}
            {r.can_close ? <Button className={r.can_take ? undefined : 'flex-1'} title={t('requests.close')} variant="secondary" onPress={() => setClosing(true)} /> : null}
          </View>
        ) : null
      }>
      <Stack.Screen options={{ title: r.client.name }} />
      <Card tone={r.overdue ? 'alert' : undefined}>
        <Between>
          <Heading className="flex-1">{r.client.name}</Heading>
          <Pill label={r.owner_display || t('requests.notTaken')} tone={r.owner_display ? 'leaf' : 'amber'} />
        </Between>
        <Small>{[r.client.origin_label, r.area, when(r.received)].filter(Boolean).join(' · ')}</Small>
        {r.reply_by ? <KeyValue label={t('requests.replyByLabel')} value={day(r.reply_by)} /> : null}
      </Card>
      {r.needs ? (
        <Card>
          <Heading>{t('requests.needs')}</Heading>
          <Body>{r.needs}</Body>
        </Card>
      ) : null}
      {r.client.contact_phone ? (
        <View className="flex-row gap-2">
          <Button className="flex-1" variant="soft" title={t('common.call')} icon={icons.phone} onPress={() => call(r.client.contact_phone)} />
          <Button className="flex-1" variant="soft" title="WhatsApp" icon={{ sf: 'message.fill', md: 'chat' }} onPress={() => whatsapp(r.client.contact_phone)} />
        </View>
      ) : null}
      {role === 'ADMIN' || role === 'ACCOUNT_MANAGER' ? <Button title={t('requests.openClient')} variant="ghost" onPress={() => router.push(`/office/client/${r.client.id}`)} /> : null}
      <Sheet open={closing} onClose={() => setClosing(false)} title={t('requests.closeTitle')}
        footer={<Button title={t('requests.close')} variant="danger" disabled={!reason} busy={busy} onPress={async () => { try { await run(`/office/requests/${id}/close/`, { body: { reason }, invalidate: refresh }); setClosing(false); router.back(); } catch { /* toast */ } }} />}>
        <OptionCards options={q.data.close_reasons} value={reason} onChange={setReason} />
      </Sheet>
    </Screen>
  );
}
