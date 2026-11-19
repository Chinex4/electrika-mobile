import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Avatar, Between, brandColors, Card, Icon, icons, Pill, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { jobTone, when } from '@/lib/format';
import type { JobRow } from '@/types/api';

/** One job, as every dashboard lists it. Tapping opens the job page. */
export function JobCard({ job, onPress, showClient = true }: { job: JobRow; onPress?: () => void; showClient?: boolean }) {
  const t = useT();
  const emergency = job.type === 'EMERGENCY';
  const late = job.live_sla === 'BREACHED' || job.sla_state === 'BREACHED';
  const atRisk = job.live_sla === 'AT_RISK';
  return (
    <Card onPress={onPress ?? (() => router.push(`/job/${job.id}`))} tone={late ? 'alert' : atRisk ? 'amber' : undefined}>
      <Between>
        <View className="flex-1 flex-row items-center gap-2">
          {emergency ? (
            <View className="h-7 w-7 items-center justify-center rounded-lg bg-alert">
              <Icon name={icons.bolt} size={14} color={brandColors.white} />
            </View>
          ) : null}
          <Text className="flex-1 text-[16px] font-semibold text-navy" numberOfLines={1}>
            {job.site?.name ?? job.type_label}
          </Text>
        </View>
        <Pill label={job.status_label} tone={jobTone(job.status)} />
      </Between>
      <Small lines={2}>
        {[job.type_label, showClient ? job.client_name : '', job.area || job.site?.area_label].filter(Boolean).join(' · ')}
      </Small>
      <Between>
        <View className="flex-row items-center gap-1.5">
          <Icon name={icons.clock} size={13} color={late ? brandColors.alert : brandColors.faint} />
          <Text className={late ? 'text-[13px] font-semibold text-alert-ink' : 'text-[13px] text-muted'}>
            {job.countdown || when(job.sla_deadline ?? job.scheduled_for ?? job.raised_at)}
          </Text>
        </View>
        {job.technician ? (
          <View className="flex-row items-center gap-1.5">
            <Avatar url={job.technician.avatar_url} initials={job.technician.initials} size={22} />
            <Text className="text-[13px] text-muted">{job.technician.first_name}</Text>
          </View>
        ) : job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && showClient ? (
          <Pill label={t('job.noEngineer')} tone="amber" />
        ) : null}
      </Between>
      {job.watch ? <Pill label={job.watch} tone="alert" /> : null}
      {job.on_the_way ? <Small>{job.on_the_way}</Small> : null}
    </Card>
  );
}
