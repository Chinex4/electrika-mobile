import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { JobCard } from '@/components/JobCard';
import {
  ActionTile,
  Avatar,
  Banner,
  Body,
  Button,
  Card,
  Failed,
  HeroCard,
  HeroStat,
  HeroStats,
  Icon,
  IconButton,
  icons,
  Loading,
  Screen,
  SectionLabel,
  Small,
} from '@/components/ui';
import { useT } from '@/i18n';
import { day } from '@/lib/format';
import { call } from '@/lib/pay';
import { useAppSelector, useResource } from '@/store/hooks';
import { selectUser } from '@/store/selectors';
import type { Job, Person, Site } from '@/types/api';
import { useColors } from '@/theme';

export type CustomerHomeData = {
  greeting: string;
  name: string;
  on_plan: boolean;
  plan: {
    tier_label: string;
    status_label: string;
    end_date: string | null;
    response_hours: number;
    visits_per_year: number;
    sites: Site[];
  } | null;
  upcoming: Job[];
  live: { title: string; sub: string; job_id: number | null } | null;
  overdue_invoice: boolean;
  unread: boolean;
  places: number;
  account_manager: Person | null;
};

/** A customer's home: help first, then their plan and what's coming up. */
export function CustomerHome() {
  const colors = useColors();
  const t = useT();
  const user = useAppSelector(selectUser);
  const q = useResource<CustomerHomeData>('/customer/home/', { poll: 60_000 });
  const d = q.data;

  return (
    <Screen tabbed refreshing={q.isRefetching} onRefresh={q.refetch}>
      <View className="flex-row items-center gap-3 pt-2">
        <Pressable onPress={() => router.push('/customer/account')}>
          <Avatar url={user?.avatar_url} initials={user?.initials} size={46} />
        </Pressable>
        <View className="flex-1">
          <Small>{d?.greeting ?? t('home.welcome')}</Small>
          <Text className="text-[22px] font-bold text-navy" numberOfLines={1}>
            {d?.name ?? user?.first_name}
          </Text>
        </View>
        <IconButton icon={icons.bell} label={t('me.notifications')} variant="surface" onPress={() => router.push('/me/notifications')} badge={d?.unread ? 1 : 0} />
      </View>

      {q.isLoading ? <Loading hero rows={2} /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}

      {d?.live ? (
        <Card tone="brand" onPress={() => (d.live?.job_id ? router.push(`/track/${d.live.job_id}`) : undefined)}>
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand">
              <Icon name={icons.play} size={18} color={colors.white} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-semibold text-navy">{d.live.title}</Text>
              <Small>{d.live.sub}</Small>
            </View>
            <Icon name={icons.chevron} size={14} color={colors.brand} />
          </View>
        </Card>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/help/emergency')}
        className="flex-row items-center gap-4 rounded-3xl bg-alert p-5 active:opacity-90">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
          <Icon name={icons.bolt} size={24} color={colors.white} />
        </View>
        <View className="flex-1">
          <Text className="text-[19px] font-bold text-white">{t('home.emergency')}</Text>
          <Text className="text-sm text-white/85">{t('home.emergencySub')}</Text>
        </View>
        <Icon name={icons.chevron} size={16} color={colors.white} />
      </Pressable>

      {d ? (
        d.on_plan && d.plan ? (
          <HeroCard>
            <View className="flex-row items-center gap-2">
              <Icon name={icons.seal} size={16} color={colors.white} />
              <Text className="text-[13px] font-semibold text-white/85">{t('home.onPlan')}</Text>
            </View>
            <Text className="text-[26px] font-extrabold text-white">{d.plan.tier_label}</Text>
            <Text className="text-sm text-white/85">{t('home.response', { h: d.plan.response_hours })}</Text>
            <HeroStats>
              <HeroStat value={d.plan.visits_per_year} label={t('home.visitsYear')} />
              <HeroStat value={d.places} label={t('home.places')} />
              <HeroStat value={d.plan.end_date ? day(d.plan.end_date) : '–'} label={t('home.renews')} />
            </HeroStats>
          </HeroCard>
        ) : (
          <HeroCard tone="navy">
            <Text className="text-[13px] font-semibold text-white/80">{t('home.free')}</Text>
            <Text className="text-[22px] font-bold text-white">{t('home.joinPlan')}</Text>
            <Text className="text-sm leading-5 text-white/85">{t('home.joinPlanSub')}</Text>
            <Button title={t('home.seePlans')} variant="white" size="sm" className="self-start" onPress={() => router.push('/plans')} />
          </HeroCard>
        )
      ) : null}

      {d?.overdue_invoice ? (
        <Pressable onPress={() => router.push('/invoices')}>
          <Banner tone="alert" title={t('home.overdueTitle')}>
            {t('home.overdueSub')}
          </Banner>
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        <ActionTile title={t('home.repair')} sub={t('home.repairSub')} icon={icons.wrench} onPress={() => router.push('/help/repair')} />
        <ActionTile title={t('home.power')} sub={t('home.powerSub')} icon={icons.megaphone} tone="amber" onPress={() => router.push('/power')} />
        <ActionTile title={t('home.care')} sub={t('home.careSub')} icon={icons.heart} tone="leaf" onPress={() => router.push(d?.on_plan ? '/care' : '/care/safety')} />
        <ActionTile title={t('home.visits')} sub={t('home.visitsSub')} icon={icons.doc} onPress={() => router.push('/visits')} />
      </View>

      {d?.upcoming.length ? <SectionLabel>{t('home.upcoming')}</SectionLabel> : null}
      {d?.upcoming.map((j) => (
        <JobCard key={j.id} job={j} showClient={false} onPress={() => router.push(j.trackable ? `/track/${j.id}` : '/visits')} />
      ))}

      {d?.account_manager ? (
        <>
          <SectionLabel>{t('home.yourAm')}</SectionLabel>
          <Card>
            <View className="flex-row items-center gap-3">
              <Avatar url={d.account_manager.avatar_url} initials={d.account_manager.initials} />
              <View className="flex-1">
                <Text className="text-[16px] font-semibold text-navy">{d.account_manager.name}</Text>
                <Small>{t('home.amSub')}</Small>
              </View>
              {d.account_manager.phone ? <IconButton icon={icons.phone} label={t('common.call')} onPress={() => call(d.account_manager!.phone)} /> : null}
            </View>
          </Card>
        </>
      ) : null}
      {d && !d.on_plan ? <Body className="pt-1 text-center text-muted">{t('home.freeFooter')}</Body> : null}
    </Screen>
  );
}
