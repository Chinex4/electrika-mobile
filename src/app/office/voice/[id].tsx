import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Banner, Between, Body, Button, Card, Failed, Field, Heading, icons, KeyValue, Loading, Pill, Screen, SectionLabel, Sheet, Small, Toggle } from '@/components/ui';
import { useT } from '@/i18n';
import { day, when } from '@/lib/format';
import { call, openPage } from '@/lib/pay';
import { useAction, useAppSelector, useResource } from '@/store/hooks';
import { selectUser } from '@/store/selectors';
import type { Choice, Person, PowerReport } from '@/types/api';

type StaffReport = PowerReport & {
  id: number;
  name: string;
  phone: string;
  step: string;
  due: string | null;
  overdue: boolean;
  all_updates: { text: string; public: boolean; by: Person | null; at: string }[];
  next_steps: Choice[];
  evidence_url: string;
};

/** A power report for the office: look after it, move it on, keep the reporter told. */
export default function OfficeVoice() {
  const t = useT();
  const me = useAppSelector(selectUser);
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = `/office/voice/${id}/`;
  const q = useResource<StaffReport>(path);
  const r = q.data;
  const { run, busy } = useAction();
  const [moving, setMoving] = useState<Choice | null>(null);
  const [reference, setReference] = useState('');
  const [noting, setNoting] = useState(false);
  const [text, setText] = useState('');
  const [isPublic, setPublic] = useState(true);
  const post = (body: Record<string, unknown>) => run(path, { body, invalidate: ['/office/voice/'] });

  if (!r) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  const mine = r.owner?.id === me?.id;
  return (
    <Screen
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      footer={!mine && r.is_open ? <Button title={t('voice.take')} icon={icons.person} busy={busy} onPress={() => post({ action: 'take' }).catch(() => undefined)} /> : null}>
      <Stack.Screen options={{ title: r.reference }} />
      <Card tone={r.overdue ? 'alert' : undefined}>
        <Between>
          <Heading className="flex-1">{r.kind_label}</Heading>
          <Pill label={r.status_label} tone={r.is_open ? 'brand' : 'leaf'} />
        </Between>
        <Small>{[r.duration_label, r.area, when(r.created_at)].filter(Boolean).join(' · ')}</Small>
        {r.step ? <Text className="text-[15px] font-semibold text-navy">{r.step}{r.due ? ` · ${t('voice.due', { day: day(r.due) })}` : ''}</Text> : null}
        {r.neighbours ? <Small>{t('voice.neighbours', { n: r.neighbours })}</Small> : null}
      </Card>
      {r.details ? <Body>{r.details}</Body> : null}
      <Card>
        <Heading>{r.name}</Heading>
        <KeyValue label={t('auth.phone')} value={r.phone} />
        <KeyValue label={t('voice.meter')} value={r.meter_number} />
        <KeyValue label={t('form.address')} value={r.address} />
        <KeyValue label={t('voice.companyRef')} value={r.company_reference} />
        <KeyValue label={t('voice.owner')} value={r.owner?.name ?? t('voice.nobody')} />
        {r.phone ? <Button size="sm" variant="soft" title={t('common.call')} icon={icons.phone} onPress={() => call(r.phone)} /> : null}
      </Card>
      {r.next_steps.length ? (
        <>
          <SectionLabel>{t('voice.nextStep')}</SectionLabel>
          {r.next_steps.map((s) => (
            <Button key={s.key} title={s.label} variant="soft" onPress={() => { setReference(r.company_reference); setMoving(s); }} />
          ))}
        </>
      ) : null}
      <Button title={t('voice.addUpdate')} variant="secondary" icon={icons.edit} onPress={() => setNoting(true)} />
      <Button title={t('voice.evidence')} variant="ghost" icon={icons.doc} onPress={() => openPage(r.evidence_url)} />
      {r.all_updates.length ? <SectionLabel>{t('voice.updates')}</SectionLabel> : null}
      {r.all_updates.map((u, i) => (
        <Card key={i}>
          <Body>{u.text}</Body>
          <Between>
            <Small>{[u.by?.name, when(u.at)].filter(Boolean).join(' · ')}</Small>
            <Pill label={u.public ? t('voice.sent') : t('voice.teamOnly')} tone={u.public ? 'leaf' : 'grey'} />
          </Between>
        </Card>
      ))}
      <Sheet open={!!moving} onClose={() => setMoving(null)} title={moving?.label ?? ''}
        footer={<Button title={t('voice.move')} busy={busy} onPress={async () => { try { await post({ action: 'move', status: moving?.key, company_reference: reference }); setMoving(null); } catch { /* toast */ } }} />}>
        {moving?.key === 'FILED' ? <Field label={t('voice.companyRef')} placeholder={t('ph.voice.companyRef')} value={reference} onChangeText={setReference} hint={t('voice.companyRefHint')} /> : <Banner tone="info">{t('voice.moveSub')}</Banner>}
      </Sheet>
      <Sheet open={noting} onClose={() => setNoting(false)} title={t('voice.addUpdate')}
        footer={<Button title={isPublic ? t('voice.sendUpdate') : t('voice.saveNote')} busy={busy} disabled={!text.trim()} onPress={async () => { try { await post({ action: 'note', text, public: isPublic }); setText(''); setNoting(false); } catch { /* toast */ } }} />}>
        <Field label={t('voice.update')} placeholder={t('ph.voice.update')} value={text} onChangeText={setText} multiline autoFocus />
        <Toggle label={t('voice.tellReporter')} sub={t('voice.tellReporterSub')} value={isPublic} onChange={setPublic} />
      </Sheet>
    </Screen>
  );
}
