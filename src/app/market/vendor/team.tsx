/** Staff accounts allowed to run the store (Enterprise). */
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { VendorTabs } from '@/components/market/VendorTabs';
import { Button, Card, Failed, Field, icons, ListGroup, Loading, Row, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { day } from '@/lib/format';
import { useAction, useResource } from '@/store/hooks';
import type { MyStore } from '@/types/market';

type Team = { seats: number; results: { id: number; name: string; added_at: string }[] };

export default function TeamScreen() {
  const t = useT();
  const q = useResource<Team>('/market/vendor/staff/');
  const store = useResource<{ store: MyStore | null }>('/market/vendor/');
  const { run, busy } = useAction();
  const [account, setAccount] = useState('');
  const owner = !!store.data?.store?.is_owner;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: '' }} />
      <Title>{t('mk.team')}</Title>
      <VendorTabs here="team" />
      <Text className="text-[13px] text-ink">{t('mk.teamNote')} {q.data ? (q.data.seats ? t('mk.seats', { n: q.data.seats }) : t('mk.seatsUpsell')) : ''}</Text>
      {q.isLoading ? <Loading rows={2} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data ? (
        <ListGroup>
          <Row title={store.data?.store?.name ?? ''} sub={t('mk.owner')} icon={icons.person} tone="leaf" last={!q.data.results.length} />
          {q.data.results.map((m, i) => (
            <Row key={m.id} title={m.name} sub={day(m.added_at)} icon={icons.person} tone="grey" last={i === q.data!.results.length - 1}
              right={owner ? <Button title={t('common.remove')} size="sm" variant="secondary"
                onPress={() => run(`/market/vendor/staff/${m.id}/`, { method: 'DELETE', success: false, invalidate: ['/market/vendor/staff/'] })} /> : undefined} />
          ))}
        </ListGroup>
      ) : null}
      {owner && q.data && q.data.seats > q.data.results.length ? (
        <Card>
          <Text className="text-[15px] font-semibold text-navy">{t('mk.addStaff')}</Text>
          <Field label={t('mk.staffAccountField')} value={account} onChangeText={setAccount} hint={t('mk.staffHint')} autoCapitalize="none" />
          <Button title={t('mk.add')} busy={busy} disabled={!account.trim()}
            onPress={async () => {
              await run('/market/vendor/staff/', { body: { account }, success: false, invalidate: ['/market/vendor/staff/'] });
              setAccount('');
            }} />
        </Card>
      ) : null}
    </Screen>
  );
}
