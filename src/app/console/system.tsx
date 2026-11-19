import { Stack } from 'expo-router';

import { Avatar, Banner, Card, Failed, Heading, icons, ListGroup, Loading, OptionCards, Pill, Row, Screen, SectionLabel, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { ConsoleGate } from '@/screens/staff/Console';
import { useAction, useResource } from '@/store/hooks';
import type { Person } from '@/types/api';

type System = { checks: { label: string; ok: boolean }[]; codes_chosen: string; codes_channel: string; admins: Person[] };

function SystemPage() {
  const t = useT();
  const q = useResource<System>('/console/system/');
  const { run } = useAction();
  const d = q.data;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('console.system') }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d ? (
        <>
          <SectionLabel>{t('console.health')}</SectionLabel>
          <ListGroup>
            {d.checks.map((c, i) => (
              <Row key={c.label} icon={c.ok ? icons.check : icons.warning} tone={c.ok ? 'leaf' : 'alert'} title={c.label}
                right={<Pill label={c.ok ? t('console.ok') : t('console.notSet')} tone={c.ok ? 'leaf' : 'alert'} />} last={i === d.checks.length - 1} />
            ))}
          </ListGroup>
          <SectionLabel>{t('console.codes')}</SectionLabel>
          <OptionCards
            value={d.codes_chosen}
            onChange={(k) =>
              run('/console/system/', { body: { codes_by: k }, invalidate: ['/console/system/', '/config/'], success: t('me.saved') }).catch(() => undefined)
            }
            options={[
              { key: 'SMS', label: t('console.codesSms'), icon: icons.phone },
              { key: 'EMAIL', label: t('console.codesEmail'), icon: { sf: 'envelope.fill', md: 'mail' } },
            ]}
          />
          {d.codes_channel !== d.codes_chosen ? <Banner tone="amber">{t('console.codesFallback', { by: d.codes_channel })}</Banner> : null}
          <Card>
            <Heading>{t('console.admins')}</Heading>
            {d.admins.map((a) => (
              <Row key={a.id} title={a.name} sub={a.phone} right={<Avatar url={a.avatar_url} initials={a.initials} size={30} />} />
            ))}
            <Small>{t('console.adminsSub')}</Small>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

export default function SystemScreen() {
  return (
    <ConsoleGate>
      <SystemPage />
    </ConsoleGate>
  );
}
