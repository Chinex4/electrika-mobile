import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { StaySafe } from '@/components/StaySafe';
import { Avatar, Banner, Button, Card, Failed, Heading, icons, Loading, Pill, Progress, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { FALLBACK_SUPPORT_PHONE, useConfig } from '@/lib/config';
import { when } from '@/lib/format';
import { call } from '@/lib/pay';
import { useResource } from '@/store/hooks';
import type { HelpRequest } from '@/types/api';

/** Where an emergency or repair request stands, refreshed every 20 seconds. */
export default function RequestStatus() {
  const t = useT();
  const { token } = useLocalSearchParams<{ token: string }>();
  const q = useResource<HelpRequest>(`/requests/${token}/`, { auth: false, poll: 20_000 });
  const config = useConfig();
  const support = config.data?.support_phone ?? FALLBACK_SUPPORT_PHONE;
  const r = q.data;
  const steps = [t('req.received'), t('req.assigned'), t('req.onTheWay'), t('req.arrived'), t('req.done')];

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch} footer={<Button title={t('help.callUs', { phone: support })} variant="secondary" icon={icons.phone} onPress={() => call(support)} />}>
      <Stack.Screen options={{ title: r?.reference ?? '' }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !r ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {r ? (
        <>
          <Card tone={r.kind === 'EMERGENCY' && r.state !== 'done' ? 'alert' : undefined}>
            <Pill label={r.kind_label} tone={r.kind === 'EMERGENCY' ? 'alert' : 'brand'} />
            <Text className="text-[22px] font-bold text-navy">{t(`req.state.${r.state}`)}</Text>
            <Small>{[r.problem, when(r.created_at)].filter(Boolean).join(' · ')}</Small>
          </Card>
          {r.state === 'cancelled' ? <Banner tone="amber">{t('req.cancelledSub')}</Banner> : <Progress steps={steps} current={r.state === 'done' ? 5 : Math.max(0, r.step - 1)} />}
          {!r.phone_confirmed && r.state === 'received' ? <Banner tone="info">{t('req.weCall')}</Banner> : null}
          {r.technician ? (
            <Card>
              <View className="flex-row items-center gap-3">
                <Avatar url={r.technician.photo_url || null} initials={r.technician.initials} size={52} />
                <View className="flex-1">
                  <Heading>{r.technician.name}</Heading>
                  <Small>{[r.technician.verification_label, r.technician.staff_id].filter(Boolean).join(' · ')}</Small>
                </View>
                {r.technician.verified ? <Pill label={t('tech.verified')} tone="leaf" /> : null}
              </View>
            </Card>
          ) : null}
          {r.state === 'on_the_way' && r.job_id ? <Button title={t('req.track')} icon={icons.map} onPress={() => router.push(`/track/${r.job_id}`)} /> : null}
          {r.stay_safe.length && r.state !== 'done' ? (
            <>
              <Heading>{t('help.staySafe')}</Heading>
              <StaySafe steps={r.stay_safe} />
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
