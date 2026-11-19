import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';

import { JobCard } from '@/components/JobCard';
import { Between, Body, Button, Card, Failed, Heading, icons, KeyValue, ListGroup, Loading, Pill, Row, Screen, SectionLabel, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { day } from '@/lib/format';
import { call, openPage } from '@/lib/pay';
import { useAction, useResource } from '@/store/hooks';
import type { JobRow, Site } from '@/types/api';

type Quote = {
  client: { id: number; name: string; contact_name: string; contact_phone: string; contact_email: string; origin_label: string };
  site: Site | null;
  notes: string;
  state: string;
  state_label: string;
  files: { name: string; url: string | null }[];
  reply_by: string | null;
  can_take: boolean;
  can_close: boolean;
  jobs: JobRow[];
  whatsapp: string;
};

export default function QuoteScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useResource<Quote>(`/office/quotes/${id}/`);
  const d = q.data;
  const { run, busy } = useAction();
  if (!d) return <Screen>{q.error ? <Failed error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  return (
    <Screen
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      footer={d.can_take || d.can_close ? (
        <View className="flex-row gap-2">
          {d.can_take ? <Button className="flex-1" title={t('requests.take')} busy={busy} onPress={() => run(`/office/requests/${id}/take/`, { invalidate: ['/office/'] }).catch(() => undefined)} /> : null}
          {d.can_close ? <Button className={d.can_take ? undefined : 'flex-1'} title={t('requests.close')} variant="secondary" onPress={() => router.push(`/office/request/${id}`)} /> : null}
        </View>
      ) : null}>
      <Stack.Screen options={{ title: d.client.name }} />
      <Card>
        <Between>
          <Heading className="flex-1">{d.client.contact_name || d.client.name}</Heading>
          <Pill label={d.state_label} tone={d.state === 'waiting' ? 'amber' : 'leaf'} />
        </Between>
        <Small>{[d.client.origin_label, d.site?.address, d.site?.area_label].filter(Boolean).join(' · ')}</Small>
        {d.reply_by ? <KeyValue label={t('requests.replyByLabel')} value={day(d.reply_by)} /> : null}
        <View className="flex-row gap-2">
          {d.client.contact_phone ? <Button className="flex-1" size="sm" variant="soft" title={t('common.call')} icon={icons.phone} onPress={() => call(d.client.contact_phone)} /> : null}
          {d.whatsapp ? <Button className="flex-1" size="sm" variant="soft" title="WhatsApp" onPress={() => Linking.openURL(d.whatsapp)} /> : null}
        </View>
      </Card>
      {d.notes ? (
        <Card>
          <Heading>{t('requests.needs')}</Heading>
          <Body>{d.notes}</Body>
        </Card>
      ) : null}
      {d.files.length ? (
        <ListGroup>
          {d.files.map((f, i) => (
            <Row key={i} icon={icons.doc} title={f.name} onPress={f.url ? () => openPage(f.url!) : undefined} last={i === d.files.length - 1} />
          ))}
        </ListGroup>
      ) : null}
      {d.jobs.length ? <SectionLabel>{t('quotes.visits')}</SectionLabel> : null}
      {d.jobs.map((j) => <JobCard key={j.id} job={j} />)}
    </Screen>
  );
}
