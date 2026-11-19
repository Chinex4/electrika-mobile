import { Stack } from 'expo-router';

import { Avatar, Between, Card, Failed, Heading, Loading, Pill, Screen, SectionLabel, Small, Stat, StatGrid } from '@/components/ui';
import { useT } from '@/i18n';
import { naira } from '@/lib/format';
import { useResource } from '@/store/hooks';
import type { Person } from '@/types/api';

type Team = {
  rows: { user: Person; tier: string; done: number; on_time: number | null; sent_back: number }[];
  jobs_done: number;
  on_time: number | null;
  credit_count: number;
  credit_sum: string;
  dispatch_passed: number;
  dispatch_returned: number;
  new_contracts: number;
  transfers_confirmed: number;
  concerns_total: number;
  concerns_on_time: number;
  follow_ups_open: number;
  follow_ups_done: number;
};

/** The team's month, for the Program Manager. */
export default function TeamScreen() {
  const t = useT();
  const q = useResource<Team>('/office/team/');
  const d = q.data;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('pm.team') }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d ? (
        <>
          <StatGrid>
            <Stat label={t('team.jobsDone')} value={d.jobs_done} />
            <Stat label={t('office.onTime')} value={d.on_time !== null ? `${d.on_time}%` : '–'} tone="leaf" />
            <Stat label={t('team.credits')} value={d.credit_count ? naira(d.credit_sum) : '0'} tone={d.credit_count ? 'alert' : undefined} />
            <Stat label={t('team.passed')} value={`${d.dispatch_passed}/${d.dispatch_passed + d.dispatch_returned}`} />
            <Stat label={t('team.newPlans')} value={d.new_contracts} />
            <Stat label={t('team.transfers')} value={d.transfers_confirmed} />
            <Stat label={t('team.concerns')} value={`${d.concerns_on_time}/${d.concerns_total}`} />
            <Stat label={t('office.followUps')} value={`${d.follow_ups_done} ✓ · ${d.follow_ups_open}`} />
          </StatGrid>
          <SectionLabel>{t('team.engineers')}</SectionLabel>
          {d.rows.map((r) => (
            <Card key={r.user.id}>
              <Between>
                <Avatar url={r.user.avatar_url} initials={r.user.initials} size={36} />
                <Heading className="ml-2 flex-1">{r.user.name}</Heading>
                {r.tier ? <Pill label={r.tier} tone="leaf" /> : null}
              </Between>
              <Small>{t('team.row', { done: r.done, onTime: r.on_time !== null ? `${r.on_time}%` : '–', back: r.sent_back })}</Small>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
