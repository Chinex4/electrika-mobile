import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Avatar, Banner, brandColors, Button, Card, Failed, Heading, HeroCard, HeroStat, HeroStats, Icon, icons, Loading, Pill, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { hereNow } from '@/tracking/journey';
import { openMaps } from '@/lib/pay';
import { useAction, useResource } from '@/store/hooks';
import type { Job, TechnicianCard } from '@/types/api';

type Live = {
  state: 'waiting' | 'en_route' | 'arrived' | 'closed';
  technician: string;
  site: { lat: number; lng: number } | null;
  site_name: string;
  position: { lat: number; lng: number; accuracy: number | null } | null;
  seconds_since_update: number | null;
  stale: boolean;
  distance_text: string;
  eta_text: string;
  arrived_at: string | null;
  headline: string;
  notice: string;
};
type Track = { job: Job; technician_card: TechnicianCard | null; live: Live; can_pin: boolean };

/** Following the engineer on the way, refreshed every 15 seconds. */
export default function TrackScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useResource<Track>(`/track/${id}/`, { poll: 15_000 });
  const d = q.data;
  const { run, busy } = useAction();
  const [pinned, setPinned] = useState(false);

  async function pin() {
    const here = await hereNow();
    if (!here) return;
    try {
      await run(`/track/${id}/pin/`, { body: here, success: t('track.pinned') });
      setPinned(true);
    } catch {
      // toast shown
    }
  }

  if (!d) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading hero />}</Screen>;
  const live = d.live;
  const card = d.technician_card;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('track.title') }} />
      <HeroCard tone={live.state === 'arrived' ? 'navy' : 'brand'}>
        <View className="flex-row items-center gap-2">
          <Icon name={live.state === 'arrived' ? icons.flag : icons.play} size={16} color={brandColors.white} />
          <Text className="text-[13px] font-semibold text-white/85">{live.site_name}</Text>
        </View>
        <Text className="text-[22px] font-bold leading-7 text-white">{live.headline || t('track.waiting')}</Text>
        {live.state === 'en_route' ? (
          <HeroStats>
            <HeroStat value={live.eta_text || '–'} label={t('track.eta')} />
            <HeroStat value={live.distance_text || '–'} label={t('track.distance')} />
          </HeroStats>
        ) : null}
      </HeroCard>
      {live.stale ? <Banner tone="amber">{t('track.stale')}</Banner> : null}
      {live.notice ? <Banner tone="info">{live.notice}</Banner> : null}
      {card ? (
        <Card>
          <View className="flex-row items-center gap-3">
            <Avatar url={card.photo_url || null} initials={card.initials} size={56} />
            <View className="flex-1">
              <Heading>{card.name}</Heading>
              <Small>{[card.verification_label, card.staff_id].filter(Boolean).join(' · ')}</Small>
            </View>
            {card.verified ? <Pill label={t('tech.verified')} tone="leaf" /> : null}
          </View>
          <Small>{t('track.checkId')}</Small>
        </Card>
      ) : null}
      {live.position ? <Button title={t('track.seeOnMap')} variant="soft" icon={icons.map} onPress={() => openMaps(live.position!.lat, live.position!.lng, card?.name ?? '')} /> : null}
      {d.can_pin && !live.site && !pinned && live.state !== 'closed' ? (
        <Card>
          <Heading>{t('track.pinTitle')}</Heading>
          <Small>{t('track.pinSub')}</Small>
          <Button title={t('track.pin')} icon={icons.location} busy={busy} onPress={pin} />
        </Card>
      ) : null}
    </Screen>
  );
}
