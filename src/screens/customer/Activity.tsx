import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Between, brandColors, Card, Empty, Failed, Heading, Icon, icons, Loading, Pill, Screen, Segmented, Small, Title, type IconName } from '@/components/ui';
import { useT } from '@/i18n';
import { when, WEB_TONE } from '@/lib/format';
import { useResource } from '@/store/hooks';

type Item = {
  kind: 'job' | 'order' | 'voice';
  at: string;
  title: string;
  sub: string;
  status: string;
  tone: string;
  job_id?: number;
  token?: string;
};

const KIND_ICON: Record<Item['kind'], IconName> = { job: icons.wrench, order: icons.box, voice: icons.megaphone };

function open(i: Item) {
  if (i.kind === 'order' && i.token) return router.push(`/shop/order/${i.token}`);
  if (i.kind === 'voice' && i.token) return router.push(`/power/${i.token}`);
  if (i.kind === 'job' && i.token) return router.push(`/request/${i.token}`);
  return router.push('/visits');
}

/** Everything the customer has going on: jobs, Shop orders, power reports. */
export function ActivityScreen() {
  const t = useT();
  const [show, setShow] = useState<'now' | 'past'>('now');
  const q = useResource<{ results: Item[]; has_any: boolean }>(`/customer/activity/?show=${show}`);
  return (
    <Screen tabbed refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Title sub={t('activity.sub')}>{t('tab.activity')}</Title>
      <Segmented value={show} onChange={setShow} options={[{ key: 'now', label: t('activity.now') }, { key: 'past', label: t('activity.past') }]} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? (
        <Empty
          title={show === 'now' ? t('activity.nothingNow') : t('activity.nothingPast')}
          sub={t('activity.emptySub')}
          icon={icons.list}
        />
      ) : null}
      {q.data?.results.map((i, n) => (
        <Card key={`${i.kind}-${i.token ?? n}`} onPress={() => open(i)}>
          <View className="flex-row gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-haze">
              <Icon name={KIND_ICON[i.kind]} size={18} color={brandColors.brand} />
            </View>
            <View className="flex-1 gap-1">
              <Between>
                <Heading className="flex-1" lines={2}>
                  {i.title}
                </Heading>
                <Pill label={i.status} tone={WEB_TONE[i.tone] ?? 'grey'} />
              </Between>
              <Small lines={2}>{[i.sub, when(i.at)].filter(Boolean).join(' · ')}</Small>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
