import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Banner, Between, Body, Button, Card, Empty, Failed, Heading, icons, Loading, Pill, Screen, Segmented, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { day, jobTone, naira, when } from '@/lib/format';
import { openPage } from '@/lib/pay';
import { useResource } from '@/store/hooks';
import type { Job, TechnicianCard } from '@/types/api';

type Visit = Job & {
  technician_card: TechnicianCard | null;
  warranty_until: string | null;
  report: { id: number; summary: string; approved_at: string; url: string | null; pdf_url: string | null } | null;
  credit: { amount: string; status: string } | null;
};

/** Visits coming up and past, each with its report, engineer, guarantee and any late-response credit. */
export default function Visits() {
  const t = useT();
  const q = useResource<{ upcoming: Visit[]; history: Visit[] }>('/customer/visits/');
  const [show, setShow] = useState<'upcoming' | 'history'>('upcoming');
  const list = q.data?.[show] ?? [];
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('account.visits') }} />
      <Segmented value={show} onChange={setShow} options={[{ key: 'upcoming', label: t('visits.upcoming'), count: q.data?.upcoming.length }, { key: 'history', label: t('visits.history') }]} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !list.length ? <Empty title={show === 'upcoming' ? t('visits.noneUpcoming') : t('visits.noneHistory')} icon={icons.calendar} /> : null}
      {list.map((v) => (
        <Card key={v.id}>
          <Between>
            <Heading className="flex-1" lines={1}>{v.site?.name ?? v.type_label}</Heading>
            <Pill label={v.status_label} tone={jobTone(v.status)} />
          </Between>
          <Small>{[v.type_label, when(v.completed_at ?? v.scheduled_for ?? v.raised_at)].filter(Boolean).join(' · ')}</Small>
          {v.technician_card ? (
            <View className="flex-row items-center gap-2">
              <Avatar url={v.technician_card.photo_url || null} initials={v.technician_card.initials} size={28} />
              <Small>{v.technician_card.name}</Small>
            </View>
          ) : null}
          {v.report ? (
            <View className="gap-2 rounded-xl bg-mist p-3">
              <Body>{v.report.summary}</Body>
              <View className="flex-row gap-2">
                {v.report.url ? <Button className="flex-1" size="sm" variant="soft" title={t('visits.report')} icon={icons.doc} onPress={() => openPage(v.report!.url!)} /> : null}
                {v.report.pdf_url ? <Button className="flex-1" size="sm" variant="soft" title="PDF" icon={icons.download} onPress={() => openPage(v.report!.pdf_url!)} /> : null}
              </View>
            </View>
          ) : null}
          {v.warranty_until ? <Small>{t('visits.guarantee', { day: day(v.warranty_until) })}</Small> : null}
          {v.credit ? <Banner tone="leaf">{t('visits.credit', { amount: naira(v.credit.amount), status: v.credit.status })}</Banner> : null}
        </Card>
      ))}
    </Screen>
  );
}
