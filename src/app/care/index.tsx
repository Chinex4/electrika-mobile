import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ActionTile, brandColors, type IconName, Card, Choices, Empty, Failed, Heading, Icon, icons, Loading, Screen, SectionLabel, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { day, when } from '@/lib/format';
import { useResource } from '@/store/hooks';
import type { Site } from '@/types/api';

type Entry = { kind: 'check' | 'report' | 'visit'; when: string; title: string; concerns?: string[]; meter_reading?: string; notes?: string; photo_url?: string | null };
type Care = { sites: Site[]; site: Site | null; logbook: Entry[]; last_check: string | null; guides_visible: boolean; safe_to_do: string[]; spot_and_report: string[]; never_do: string[] };

const KIND_ICON = { check: icons.checklist, report: icons.eyeTrouble, visit: icons.wrench };

/** Care between visits: the site's logbook, the monthly check and "I noticed something". */
export default function CareHome() {
  const t = useT();
  const [site, setSite] = useState('');
  const q = useResource<Care>(`/care/${site ? `?site=${site}` : ''}`);
  const d = q.data;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('account.care') }} />
      {q.isLoading ? <Loading hero /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d ? (
        <>
          {d.sites.length > 1 ? <Choices scroll options={d.sites.map((s) => ({ key: String(s.id), label: s.name }))} value={String(d.site?.id ?? '')} onChange={setSite} /> : null}
          <View className="flex-row flex-wrap gap-2">
            <ActionTile title={t('care.check')} sub={d.last_check ? t('care.lastCheck', { day: day(d.last_check) }) : t('care.checkSub')} icon={icons.checklist} tone="leaf" onPress={() => router.push('/care/check')} />
            <ActionTile title={t('care.noticed')} sub={t('care.noticedSub')} icon={icons.eyeTrouble} tone="amber" onPress={() => router.push('/care/noticed')} />
            {d.guides_visible ? <ActionTile title={t('care.guides')} sub={t('care.guidesSub')} icon={icons.book} onPress={() => router.push('/care/guides')} /> : null}
            <ActionTile title={t('care.safety')} sub={t('care.safetySub')} icon={icons.shield} tone="alert" onPress={() => router.push('/care/safety')} />
          </View>
          <SectionLabel>{t('care.logbook')}</SectionLabel>
          {!d.logbook.length ? <Empty title={t('care.logEmpty')} sub={t('care.logEmptySub')} icon={icons.logbook} /> : null}
          {d.logbook.map((e, i) => (
            <Card key={i}>
              <View className="flex-row gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-haze">
                  <Icon name={KIND_ICON[e.kind] ?? icons.logbook} size={17} color={brandColors.brand} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Heading className="text-[15px]">{e.title}</Heading>
                  <Small>{when(e.when)}</Small>
                  {e.concerns?.length ? <Text className="text-sm text-amber-ink">{e.concerns.join(' · ')}</Text> : null}
                  {e.meter_reading ? <Small>{t('care.meter', { n: e.meter_reading })}</Small> : null}
                  {e.notes ? <Small lines={3}>{e.notes}</Small> : null}
                </View>
              </View>
            </Card>
          ))}
          <SafeLists safe={d.safe_to_do} spot={d.spot_and_report} never={d.never_do} />
        </>
      ) : null}
    </Screen>
  );
}

function SafeLists({ safe, spot, never }: { safe: string[]; spot: string[]; never: string[] }) {
  const t = useT();
  const block = (title: string, items: string[], tone: 'leaf' | 'amber' | 'alert', icon: IconName = icons.check) => (
    <Card tone={tone}>
      <Heading className="text-[16px]">{title}</Heading>
      {items.map((x) => (
        <View key={x} className="flex-row gap-2">
          <Icon name={icon} size={15} color={tone === 'leaf' ? brandColors.leafInk : tone === 'amber' ? brandColors.amberInk : brandColors.alertInk} />
          <Text className="flex-1 text-sm leading-5 text-ink">{x}</Text>
        </View>
      ))}
    </Card>
  );
  return (
    <>
      <SectionLabel>{t('care.yourPart')}</SectionLabel>
      {block(t('care.safeToDo'), safe, 'leaf')}
      {block(t('care.spot'), spot, 'amber', icons.eye)}
      {block(t('care.never'), never, 'alert', icons.close)}
    </>
  );
}
