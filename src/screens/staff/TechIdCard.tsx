import { Pressable, Text, View } from 'react-native';

import { Avatar, Between, Card, cx, Heading, Icon, icons, Pill, Small, Stat, StatGrid } from '@/components/ui';
import { useT } from '@/i18n';
import { useAction, useAppSelector, useResource } from '@/store/hooks';
import { selectUser } from '@/store/selectors';
import { useColors } from '@/theme';

export type TechMe = {
  staff_id: string;
  photo_url: string | null;
  verified: boolean;
  verification_label: string;
  cluster_label: string;
  skills: string[];
  on_duty: boolean;
  working_today: boolean;
  week: { day: string; label: string; on: boolean }[];
  month: { done: number; on_time_percent: number | null; sent_back: number };
};

/** An engineer's ID card, working days and this month's figures. */
export function TechIdCard() {
  const colors = useColors();
  const t = useT();
  const user = useAppSelector(selectUser);
  const q = useResource<TechMe>('/me/technician/');
  const { run } = useAction();
  const d = q.data;
  if (!d || !user) return null;

  const toggleDay = (day: string) => {
    const days = d.week.filter((w) => (w.day === day ? !w.on : w.on)).map((w) => w.day).join('');
    run('/me/technician/', { method: 'PATCH', body: { working_days: days }, invalidate: ['/me/technician/', '/tech/'], success: t('tech.daysSaved') }).catch(() => undefined);
  };

  return (
    <>
      <Card>
        <View className="flex-row items-center gap-3">
          <Avatar url={d.photo_url ?? user.avatar_url} initials={user.initials} size={52} />
          <View className="flex-1 gap-0.5">
            <Heading>{t('tech.idCard')}</Heading>
            <Small>{[d.staff_id, d.cluster_label].filter(Boolean).join(' · ')}</Small>
          </View>
          {d.verified ? (
            <View className="flex-row items-center gap-1">
              <Icon name={icons.seal} size={16} color={colors.leaf} />
              <Pill label={d.verification_label || t('tech.verified')} tone="leaf" />
            </View>
          ) : (
            <Pill label={t('tech.notVerified')} tone="amber" />
          )}
        </View>
        {d.skills.length ? <Small>{d.skills.join(' · ')}</Small> : null}
      </Card>

      <Card>
        <Between>
          <Heading>{t('tech.workingDays')}</Heading>
          <Pill label={d.working_today ? t('tech.workingToday') : t('tech.dayOff')} tone={d.working_today ? 'leaf' : 'grey'} />
        </Between>
        <View className="flex-row justify-between pt-1">
          {d.week.map((w) => (
            <Pressable
              key={w.day}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: w.on }}
              onPress={() => toggleDay(w.day)}
              className={cx('h-11 w-11 items-center justify-center rounded-full border-[1.5px]', w.on ? 'border-accent bg-brand' : 'border-line bg-surface')}>
              <Text className={cx('text-xs font-bold', w.on ? 'text-white' : 'text-muted')}>{w.label.slice(0, 2)}</Text>
            </Pressable>
          ))}
        </View>
        <Small>{t('tech.workingDaysSub')}</Small>
      </Card>

      <StatGrid>
        <Stat label={t('tech.doneMonth')} value={d.month.done} />
        <Stat label={t('tech.onTime')} value={d.month.on_time_percent !== null ? `${d.month.on_time_percent}%` : '–'} tone="leaf" />
        <Stat label={t('tech.sentBack')} value={d.month.sent_back} tone={d.month.sent_back ? 'alert' : undefined} />
      </StatGrid>
    </>
  );
}
