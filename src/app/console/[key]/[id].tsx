import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Card, Failed, Field, Heading, icons, KeyValue, Loading, Pill, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { cellText } from '@/lib/cells';
import { openPage } from '@/lib/pay';
import { ConsoleGate } from '@/screens/staff/Console';
import { useAction, useResource } from '@/store/hooks';


type Detail = {
  title: string;
  kicker: string;
  pill: { label: string; tone: string } | null;
  groups: { heading: string; rows: { label: string; value: unknown }[] }[];
  texts: { heading: string; text: string }[];
  links: { label: string; url: string }[];
  /** Marketplace decisions (verify, take down, approve…). */
  moves?: { action: string; label: string; kind: 'primary' | 'line' | 'red' }[];
};

const PILL: Record<string, 'leaf' | 'alert' | 'amber' | 'grey' | 'brand'> = { good: 'leaf', bad: 'alert', warn: 'amber', muted: 'grey' };

function RecordPage() {
  const { key, id } = useLocalSearchParams<{ key: string; id: string }>();
  const t = useT();
  const q = useResource<Detail>(`/console/records/${key}/${id}/`);
  const { run, busy } = useAction();
  const [note, setNote] = useState('');
  const d = q.data;
  const decide = async (action: string) => {
    await run(`/console/records/${key}/${id}/move/`, { body: { action, note }, invalidate: ['/console/'] });
    setNote('');
  };
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: d?.kicker ?? '' }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d ? (
        <>
          <Text className="text-[24px] font-bold text-navy">{d.title}</Text>
          {d.pill ? <Pill label={d.pill.label} tone={PILL[d.pill.tone] ?? 'brand'} /> : null}
          {d.groups.map((g) => (
            <Card key={g.heading}>
              <Heading>{g.heading}</Heading>
              {g.rows.map((r) => (
                <KeyValue key={r.label} label={r.label} value={cellText(r.value)} />
              ))}
            </Card>
          ))}
          {d.texts.map((x) => (
            <Card key={x.heading}>
              <Heading>{x.heading}</Heading>
              <Body>{x.text}</Body>
            </Card>
          ))}
          {d.links.map((l) => (
            <Button key={l.url} title={l.label} variant="secondary" icon={icons.arrowUp} onPress={() => openPage(l.url)} />
          ))}
          {d.moves?.length ? (
            <Card>
              <Heading>{t('console.decide')}</Heading>
              <Field label={t('console.note')} multiline value={note} onChangeText={setNote} hint={t('console.noteHint')} />
              <View className="gap-2">
                {d.moves.map((m) => (
                  <Button key={m.action} title={m.label} busy={busy} variant={m.kind === 'primary' ? 'primary' : m.kind === 'red' ? 'danger' : 'secondary'}
                    onPress={() => decide(m.action)} />
                ))}
              </View>
            </Card>
          ) : null}
          {!d.groups.length && !d.texts.length ? <Small>—</Small> : null}
        </>
      ) : null}
    </Screen>
  );
}

export default function Record() {
  return (
    <ConsoleGate>
      <RecordPage />
    </ConsoleGate>
  );
}
