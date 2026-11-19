import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Empty, Failed, Field, icons, ListGroup, Loading, Row, Screen, Segmented, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { when } from '@/lib/format';
import { ConsoleGate, type AuditRow } from '@/screens/staff/Console';
import { useResource } from '@/store/hooks';

function AuditPage() {
  const t = useT();
  const [kind, setKind] = useState<'' | 'security' | 'changes'>('');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const id = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);
  const qs = new URLSearchParams({ page: String(page), ...(kind ? { kind } : {}), ...(term ? { q: term } : {}) }).toString();
  const q = useResource<{ count: number; page: number; pages: number; results: AuditRow[] }>(`/console/audit/?${qs}`);
  const d = q.data;
  const security = (a: AuditRow) => a.action.includes('failed') || a.action.includes('blocked');
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('console.audit') }} />
      <Segmented value={kind} onChange={(k) => { setKind(k); setPage(1); }} options={[{ key: '', label: t('common.all') }, { key: 'security', label: t('console.security') }, { key: 'changes', label: t('console.changes') }]} />
      <Field label={t('common.search')} placeholder={t('ph.common.search')} icon={icons.search} value={search} onChangeText={(v) => { setSearch(v); setPage(1); }} autoCapitalize="none" />
      {q.isLoading ? <Loading rows={6} /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d && !d.results.length ? <Empty title={t('common.none')} icon={icons.history} /> : null}
      {d?.results.length ? (
        <ListGroup>
          {d.results.map((a, i) => (
            <Row key={a.id} icon={security(a) ? icons.warning : icons.history} tone={security(a) ? 'alert' : 'grey'} title={a.summary}
              sub={[a.who?.name ?? '—', when(a.at), a.ip].filter(Boolean).join(' · ')} last={i === d.results.length - 1} />
          ))}
        </ListGroup>
      ) : null}
      {d && d.pages > 1 ? (
        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="secondary" title={t('common.previous')} disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
          <Small>{t('console.page', { n: d.page, of: d.pages })}</Small>
          <Button size="sm" variant="secondary" title={t('common.next')} disabled={page >= d.pages} onPress={() => setPage((p) => p + 1)} />
        </View>
      ) : null}
    </Screen>
  );
}

export default function Audit() {
  return (
    <ConsoleGate>
      <AuditPage />
    </ConsoleGate>
  );
}
