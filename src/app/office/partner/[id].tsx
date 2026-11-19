import { Stack, useLocalSearchParams } from 'expo-router';

import { Button, Card, Choices, Failed, Field, Heading, icons, KeyValue, Loading, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { day } from '@/lib/format';
import { call } from '@/lib/pay';
import { useDraft } from '@/lib/useDraft';
import { useAction, useResource } from '@/store/hooks';
import type { Choice, Site } from '@/types/api';

type Partner = { client: { id: number; name: string; contact_name: string; contact_phone: string; contact_email: string; partner_stage: string }; note: string; site: Site | null; reply_by: string; stages: Choice[] };

export default function PartnerScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = `/office/partners/${id}/`;
  const q = useResource<Partner>(path);
  const d = q.data;
  const { run, busy } = useAction();
  const [note, setNote] = useDraft(d?.note ?? '', d?.note);
  const save = (body: Record<string, unknown>) => run(path, { method: 'PATCH', body, invalidate: ['/office/partners/'], success: t('me.saved') }).catch(() => undefined);

  if (!d) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  return (
    <Screen>
      <Stack.Screen options={{ title: d.client.name }} />
      <Card>
        <Heading>{d.client.contact_name}</Heading>
        <KeyValue label={t('auth.phone')} value={d.client.contact_phone} />
        <KeyValue label={t('auth.emailRequired')} value={d.client.contact_email} />
        <KeyValue label={t('requests.replyByLabel')} value={day(d.reply_by)} />
        {d.site?.address ? <Small>{d.site.address}</Small> : null}
        {d.client.contact_phone ? <Button size="sm" variant="soft" title={t('common.call')} icon={icons.phone} onPress={() => call(d.client.contact_phone)} /> : null}
      </Card>
      <Choices label={t('partners.stage')} options={d.stages} value={d.client.partner_stage} onChange={(k) => save({ stage: k })} />
      <Field label={t('partners.note')} placeholder={t('ph.partners.note')} value={note} onChangeText={setNote} multiline />
      <Button title={t('orders.saveNote')} variant="secondary" busy={busy} disabled={note === d.note} onPress={() => save({ note })} />
    </Screen>
  );
}
