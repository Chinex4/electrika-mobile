import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Banner, Between, Body, Button, Card, Failed, Heading, KeyValue, Loading, Pill, Screen, SectionLabel, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { day, when } from '@/lib/format';
import { useAction, useResource } from '@/store/hooks';
import type { PowerReport } from '@/types/api';

export default function PowerReportScreen() {
  const t = useT();
  const { token } = useLocalSearchParams<{ token: string }>();
  const path = `/voice/${token}/`;
  const q = useResource<PowerReport>(path, { auth: false, poll: 60_000 });
  const r = q.data;
  const { run, busy } = useAction();
  const answer = (a: 'yes' | 'no') => run(`/voice/${token}/confirm/`, { body: { answer: a }, auth: false, invalidate: ['/voice/'], success: a === 'yes' ? t('power.thanksSorted') : t('power.keepGoing') }).catch(() => undefined);

  if (!r) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: r.reference }} />
      <Card>
        <Between>
          <Heading className="flex-1">{r.kind_label}</Heading>
          <Pill label={r.status_label} tone={r.is_open ? 'brand' : 'leaf'} />
        </Between>
        <Small>{[r.duration_label, when(r.created_at)].join(' · ')}</Small>
        {r.clock ? (
          <View className="gap-1 pt-1">
            <View className="h-2 overflow-hidden rounded-full bg-mist">
              <View className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, r.clock.percent)}%` }} />
            </View>
            <Small>{t('power.clock', { used: r.clock.used, of: r.clock.of })}</Small>
          </View>
        ) : null}
      </Card>
      {r.neighbours ? <Banner tone="info">{t('power.neighbours', { n: r.neighbours })}</Banner> : null}
      {r.can_confirm ? (
        <Card tone="leaf">
          <Heading>{t('power.sortedQ')}</Heading>
          <View className="flex-row gap-2">
            <Button className="flex-1" title={t('power.yes')} variant="success" busy={busy} onPress={() => answer('yes')} />
            <Button className="flex-1" title={t('power.no')} variant="secondary" onPress={() => answer('no')} />
          </View>
        </Card>
      ) : null}
      <Card>
        <KeyValue label={t('voice.companyRef')} value={r.company_reference} />
        <KeyValue label={t('voice.owner')} value={r.owner?.name} />
        <KeyValue label={t('power.pickupBy')} value={r.pickup_by ? day(r.pickup_by) : ''} />
        <KeyValue label={t('power.replyBy')} value={r.reply_by ? day(r.reply_by) : ''} />
        {r.details ? <Body>{r.details}</Body> : null}
      </Card>
      {r.updates.length ? <SectionLabel>{t('voice.updates')}</SectionLabel> : null}
      {r.updates.map((u, i) => (
        <Card key={i}>
          <Text className="text-[15px] text-ink">{u.text}</Text>
          <Small>{when(u.at)}</Small>
        </Card>
      ))}
    </Screen>
  );
}
