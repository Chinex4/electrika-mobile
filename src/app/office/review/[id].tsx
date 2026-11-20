import { Image } from 'expo-image';

import { remoteImage } from '@/api/client';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Banner, Between, Body, Button, Card, Check, Failed, Field, Heading, icons, KeyValue, Loading, Pill, Screen, SectionLabel, Sheet, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { when } from '@/lib/format';
import { openPage } from '@/lib/pay';
import { useDraft } from '@/lib/useDraft';
import { useAction, useResource } from '@/store/hooks';
import type { Choice, Person } from '@/types/api';

type Review = {
  id: number;
  client: string;
  site: string;
  technician: Person | null;
  status_label: string;
  waiting_on_site: boolean;
  job_id: number | null;
  summary: string;
  technician_notes: string;
  dispatch_stage: boolean;
  pm_stage: boolean;
  checks: Choice[];
  can_review: boolean;
  account_manager: Person | null;
  photos: { id: number; url: string | null; caption: string }[];
  parts: { name: string; quantity: number }[];
  reviews: { stage: string; decision: string; by: Person | null; comment: string; at: string }[];
  pdf_url: string | null;
};

/** Signing off a job report: Dispatch ticks the four checks, the Program Manager approves it to the client. */
export default function ReviewScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useResource<Review>(`/dispatch/reports/${id}/`);
  const r = q.data;
  const { run, busy } = useAction();
  const [ticked, setTicked] = useState<string[]>([]);
  const [summary, setSummary] = useDraft(r?.summary ?? '', r?.id);
  const [comment, setComment] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [sendingBack, setSendingBack] = useState(false);

  async function decide(action: 'approve' | 'send_back') {
    try {
      await run(`/dispatch/reports/${id}/`, {
        body: { action, comment, summary, checks: ticked, follow_up_note: followUp },
        invalidate: ['/dispatch/', '/office/', '/job/'],
      });
      setSendingBack(false);
      router.back();
    } catch {
      // toast shown
    }
  }

  if (!r) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  const allTicked = !r.dispatch_stage || r.checks.every((c) => ticked.includes(c.key));

  return (
    <Screen
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      footer={
        r.can_review ? (
          <View className="flex-row gap-2">
            <Button className="flex-1" title={r.pm_stage ? t('review.approveSend') : t('review.approve')} variant="success" icon={icons.seal} disabled={!allTicked} busy={busy} onPress={() => decide('approve')} />
            <Button title={t('review.sendBack')} variant="secondary" onPress={() => setSendingBack(true)} />
          </View>
        ) : null
      }>
      <Stack.Screen options={{ title: t('review.title') }} />
      <Card tone={r.waiting_on_site ? 'alert' : undefined}>
        <Between>
          <Heading className="flex-1">{r.site || r.client}</Heading>
          <Pill label={r.status_label} tone="amber" />
        </Between>
        <Small>{[r.client, r.technician?.name].filter(Boolean).join(' · ')}</Small>
        {r.job_id ? <Button size="sm" variant="soft" title={t('review.openJob')} onPress={() => router.push(`/job/${r.job_id}`)} /> : null}
      </Card>
      {r.waiting_on_site ? <Banner tone="alert">{t('review.onSiteSub')}</Banner> : null}
      {!r.can_review ? <Banner tone="info">{t('review.notYours')}</Banner> : null}

      <Card>
        <Heading>{t('review.engineerNotes')}</Heading>
        <Body>{r.technician_notes || '—'}</Body>
      </Card>
      {r.photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {r.photos.map((p) => (p.url ? <Image key={p.id} source={remoteImage(p.url)} style={{ width: 130, height: 130, borderRadius: 14 }} contentFit="cover" /> : null))}
        </ScrollView>
      ) : null}
      {r.parts.length ? (
        <Card>
          <Heading>{t('report.parts')}</Heading>
          {r.parts.map((p) => (
            <KeyValue key={p.name} label={p.name} value={`× ${p.quantity}`} />
          ))}
        </Card>
      ) : null}

      {r.can_review ? (
        <>
          <Field label={t('review.summary')} placeholder={t('ph.review.summary')} value={summary} onChangeText={setSummary} multiline hint={t('review.summaryHint')} />
          {r.dispatch_stage ? (
            <Card>
              <Heading>{t('review.checks')}</Heading>
              {r.checks.map((c) => (
                <Check key={c.key} label={c.label} value={ticked.includes(c.key)} onChange={(v) => setTicked((x) => (v ? [...x, c.key] : x.filter((k) => k !== c.key)))} />
              ))}
            </Card>
          ) : null}
          {r.pm_stage ? <Field label={t('review.followUp')} placeholder={t('ph.review.followUp')} value={followUp} onChangeText={setFollowUp} multiline hint={r.account_manager ? t('review.followUpHint', { name: r.account_manager.name }) : undefined} /> : null}
        </>
      ) : null}

      {r.reviews.length ? (
        <>
          <SectionLabel>{t('review.history')}</SectionLabel>
          {r.reviews.map((x, i) => (
            <Card key={i}>
              <Between>
                <Heading>{x.stage}</Heading>
                <Pill label={x.decision} tone={x.decision.toLowerCase().includes('back') ? 'alert' : 'leaf'} />
              </Between>
              {x.comment ? <Body>{x.comment}</Body> : null}
              <Small>{[x.by?.name, when(x.at)].filter(Boolean).join(' · ')}</Small>
            </Card>
          ))}
        </>
      ) : null}
      {r.pdf_url ? <Button title={t('review.pdf')} variant="secondary" icon={icons.doc} onPress={() => openPage(r.pdf_url!)} /> : null}

      <Sheet open={sendingBack} onClose={() => setSendingBack(false)} title={t('review.sendBack')} sub={t('review.sendBackSub')}
        footer={<Button title={t('review.sendBack')} variant="danger" disabled={!comment.trim()} busy={busy} onPress={() => decide('send_back')} />}>
        <Field label={t('review.note')} placeholder={t('ph.review.note')} value={comment} onChangeText={setComment} multiline autoFocus />
      </Sheet>
    </Screen>
  );
}
