import { Stack } from 'expo-router';

import { Banner, Button, Failed, icons, ListGroup, Loading, Pill, Row, Screen } from '@/components/ui';
import { useT } from '@/i18n';
import { ago } from '@/lib/format';
import { useAction, useResource } from '@/store/hooks';

type Device = { id: number; name: string; platform: string; last_used_at: string | null; this_phone: boolean; push: boolean };

/** Phones signed in to this account. Sign out any you don't recognise. */
export default function Devices() {
  const t = useT();
  const q = useResource<{ results: Device[] }>('/me/devices/');
  const { run } = useAction();
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('me.devices') }} />
      <Banner tone="info">{t('devices.sub')}</Banner>
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data ? (
        <ListGroup>
          {q.data.results.map((d, i) => (
            <Row
              key={d.id}
              icon={icons.phoneDevice}
              tone={d.this_phone ? 'leaf' : 'brand'}
              title={d.name || d.platform}
              sub={[d.platform, d.last_used_at ? ago(d.last_used_at) : '', d.push ? t('devices.push') : ''].filter(Boolean).join(' · ')}
              right={d.this_phone ? <Pill label={t('devices.this')} tone="leaf" /> : <Button size="sm" variant="ghost" title={t('common.signOut')} onPress={() => run(`/me/devices/${d.id}/`, { method: 'DELETE', invalidate: ['/me/devices/'], success: t('devices.signedOut') }).catch(() => undefined)} />}
              last={i === q.data!.results.length - 1}
            />
          ))}
        </ListGroup>
      ) : null}
    </Screen>
  );
}
