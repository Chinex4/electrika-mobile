import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { JobCard } from '@/components/JobCard';
import { Banner, Button, Card, Empty, Failed, HeroCard, HeroStat, HeroStats, Icon, icons, Loading, Pill, Screen, SectionLabel, Small, Title, Toggle } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { useAppDispatch, useAppSelector, useResource } from '@/store/hooks';
import { selectJourney, selectUser } from '@/store/selectors';
import { setDuty } from '@/store/slices/journey';
import type { ApiFailure, JobRow } from '@/types/api';
import { useColors } from '@/theme';

type MyJobs = { on_duty: boolean; working_today: boolean; location_consent: boolean; jobs: JobRow[]; done_today: JobRow[] };

/** The engineer's day: duty switch, the next job up top, then the rest. */
export function TechJobs() {
  const colors = useColors();
  const t = useT();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const journey = useAppSelector(selectJourney);
  const q = useResource<MyJobs>('/tech/jobs/', { poll: 30_000 });
  const d = q.data;
  const [next, ...later] = d?.jobs ?? [];

  async function duty(on: boolean) {
    try {
      const res = await dispatch(setDuty(on)).unwrap();
      notify.success(res.detail);
    } catch (e) {
      notify.error((e as ApiFailure).message);
    }
  }

  return (
    <Screen tabbed refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Title sub={t('tech.hello', { name: user?.first_name ?? '' })}>{t('tab.jobs')}</Title>
      {q.isLoading ? <Loading hero /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d ? (
        <>
          <Card tone={d.on_duty ? 'leaf' : undefined}>
            <Toggle label={d.on_duty ? t('tech.onDuty') : t('tech.offDuty')} sub={d.on_duty ? t('tech.onDutySub') : t('tech.offDutySub')} value={d.on_duty} onChange={duty} />
          </Card>
          {!d.working_today ? <Banner tone="info">{t('tech.notWorkingToday')}</Banner> : null}
          {journey.jobId ? (
            <Card tone="brand" onPress={() => router.push(`/job/${journey.jobId}`)}>
              <View className="flex-row items-center gap-3">
                <Icon name={icons.location} size={18} color={colors.brand} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-navy">{t('tech.sharing')}</Text>
                  <Small>{journey.sharing === 'foreground' ? t('tech.sharingOpen') : t('tech.sharingBackground')}</Small>
                </View>
              </View>
            </Card>
          ) : null}
          {next ? (
            <>
              <SectionLabel>{t('tech.next')}</SectionLabel>
              <Pressed job={next} />
            </>
          ) : (
            <Empty title={t('tech.noJobs')} sub={d.on_duty ? t('tech.noJobsSub') : undefined} icon={icons.check} />
          )}
          {later.length ? <SectionLabel>{t('tech.later')}</SectionLabel> : null}
          {later.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
          {d.done_today.length ? <SectionLabel>{t('tech.doneToday')}</SectionLabel> : null}
          {d.done_today.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

/** The next job, big: where, when, and one tap to open it. */
function Pressed({ job }: { job: JobRow }) {
  const colors = useColors();
  const t = useT();
  const emergency = job.type === 'EMERGENCY';
  return (
    <HeroCard tone={emergency ? 'alert' : 'brand'}>
      <View className="flex-row items-center gap-2">
        <Icon name={emergency ? icons.bolt : icons.wrench} size={16} color={colors.white} />
        <Text className="text-[13px] font-semibold text-white/90">{job.type_label}</Text>
      </View>
      <Text className="text-[24px] font-bold text-white" numberOfLines={2}>
        {job.site?.name ?? job.client_name}
      </Text>
      <Text className="text-sm text-white/85" numberOfLines={2}>
        {[job.site?.address_line, job.site?.landmark].filter(Boolean).join(' · ')}
      </Text>
      <HeroStats>
        <HeroStat value={job.countdown || '–'} label={emergency ? t('tech.timeLeft') : t('tech.when')} />
        <HeroStat value={job.status_label} label={t('tech.status')} />
      </HeroStats>
      <View className="flex-row items-center gap-2">
        <Button title={t('tech.openJob')} variant="white" size="sm" onPress={() => router.push(`/job/${job.id}`)} />
        {job.report_status === 'RETURNED' ? <Pill label={t('tech.sentBackFix')} tone="amber" /> : null}
      </View>
    </HeroCard>
  );
}

/** Finished in the last 30 days, with where each report is. */
export function TechDone() {
  const t = useT();
  const q = useResource<{ results: JobRow[] }>('/tech/done/');
  return (
    <Screen tabbed refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Title sub={t('tech.doneSub')}>{t('tab.done')}</Title>
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('tech.noneDone')} icon={icons.check} /> : null}
      {q.data?.results.map((j) => (
        <View key={j.id} className="gap-1">
          <JobCard job={j} />
          {j.report_status_label ? (
            <View className="flex-row px-1">
              <Pill label={j.report_status_label} tone={j.report_status === 'APPROVED' ? 'leaf' : j.report_status === 'RETURNED' ? 'alert' : 'amber'} />
            </View>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}
