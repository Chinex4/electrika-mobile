import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Banner, Between, Body, Button, Card, Failed, Field, Heading, icons, KeyValue, Loading, Pill, Screen, SectionLabel, Sheet, Small, Stat, StatGrid } from '@/components/ui';
import { useT } from '@/i18n';
import { day, naira, when } from '@/lib/format';
import { call, whatsapp } from '@/lib/pay';
import { useAction, useResource } from '@/store/hooks';
import type { Person, Site } from '@/types/api';

type ClientGlance = {
  client: { id: number; name: string; contact_name: string; contact_phone: string; contact_email: string; origin_label: string; account_manager: Person | null };
  contract: { tier_label: string; status_label: string; end_date: string; annual_fee: string; response_hours: number } | null;
  on_time: number | null;
  credit_count: number;
  credit_sum: string;
  concerns: { id: number; category_label: string; description: string; status_label: string; reply_due: string }[];
  follow_ups: { id: number; note: string; asked_by: Person | null; created_at: string }[];
  timeline: { at: string; text: string }[];
  overdue: number;
  sites: Site[];
};

/** A client at a glance, for their Account Manager and the Program Manager. */
export default function ClientScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useResource<ClientGlance>(`/office/clients/${id}/`);
  const d = q.data;
  const { run, busy } = useAction();
  const [done, setDone] = useState<number | null>(null);
  const [note, setNote] = useState('');

  if (!d) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  const c = d.client;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: c.name }} />
      <Card>
        <Heading>{c.contact_name || c.name}</Heading>
        <Small>{[c.origin_label, c.account_manager?.name].filter(Boolean).join(' · ')}</Small>
        <KeyValue label={t('auth.phone')} value={c.contact_phone} />
        <KeyValue label={t('auth.emailRequired')} value={c.contact_email} />
        {c.contact_phone ? (
          <Between>
            <Button className="flex-1" size="sm" variant="soft" title={t('common.call')} icon={icons.phone} onPress={() => call(c.contact_phone)} />
            <Button className="flex-1" size="sm" variant="soft" title="WhatsApp" icon={{ sf: 'message.fill', md: 'chat' }} onPress={() => whatsapp(c.contact_phone)} />
          </Between>
        ) : null}
      </Card>
      {d.contract ? (
        <Card>
          <Between>
            <Heading>{d.contract.tier_label}</Heading>
            <Pill label={d.contract.status_label} tone="leaf" />
          </Between>
          <KeyValue label={t('client.fee')} value={naira(d.contract.annual_fee)} />
          <KeyValue label={t('client.ends')} value={day(d.contract.end_date)} />
          <KeyValue label={t('client.response')} value={t('client.hours', { n: d.contract.response_hours })} />
        </Card>
      ) : (
        <Banner tone="info">{t('client.noPlan')}</Banner>
      )}
      <StatGrid>
        <Stat label={t('client.onTime')} value={d.on_time !== null ? `${d.on_time}%` : '–'} tone="leaf" />
        <Stat label={t('office.overdue')} value={d.overdue} tone={d.overdue ? 'alert' : undefined} />
        <Stat label={t('client.credits')} value={d.credit_count ? naira(d.credit_sum) : '0'} />
      </StatGrid>
      {d.follow_ups.length ? <SectionLabel>{t('office.followUps')}</SectionLabel> : null}
      {d.follow_ups.map((f) => (
        <Card key={f.id}>
          <Body>{f.note}</Body>
          <Small>{[f.asked_by?.name, when(f.created_at)].filter(Boolean).join(' · ')}</Small>
          <Button size="sm" variant="soft" title={t('client.markDone')} icon={icons.check} onPress={() => setDone(f.id)} />
        </Card>
      ))}
      {d.concerns.length ? <SectionLabel>{t('am.concerns')}</SectionLabel> : null}
      {d.concerns.map((x) => (
        <Card key={x.id}>
          <Between>
            <Heading className="flex-1">{x.category_label}</Heading>
            <Pill label={x.status_label} tone="amber" />
          </Between>
          <Small lines={3}>{x.description}</Small>
          <Small>{t('am.replyBy', { day: day(x.reply_due) })}</Small>
        </Card>
      ))}
      {d.sites.length ? <SectionLabel>{t('client.sites')}</SectionLabel> : null}
      {d.sites.map((s) => (
        <Card key={s.id}>
          <Heading>{s.name}</Heading>
          <Small>{[s.address_line || s.address, s.area_label].filter(Boolean).join(' · ')}</Small>
        </Card>
      ))}
      {d.timeline.length ? (
        <Card>
          <Heading>{t('client.timeline')}</Heading>
          {d.timeline.map((e, i) => (
            <KeyValue key={i} label={day(e.at)} value={e.text} />
          ))}
        </Card>
      ) : null}
      <Sheet open={done !== null} onClose={() => setDone(null)} title={t('client.markDone')}
        footer={<Button title={t('client.markDone')} busy={busy} onPress={async () => { try { await run(`/office/follow-ups/${done}/done/`, { body: { note }, invalidate: ['/office/'] }); setDone(null); setNote(''); } catch { /* toast */ } }} />}>
        <Field label={t('client.doneNote')} placeholder={t('ph.client.doneNote')} value={note} onChangeText={setNote} multiline />
      </Sheet>
    </Screen>
  );
}
