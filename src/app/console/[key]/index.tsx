import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Banner, Button, Card, Choices, cx, Empty, Failed, Field, icons, Loading, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { ConsoleGate } from '@/screens/staff/Console';
import { useResource } from '@/store/hooks';
import { cellText } from '@/lib/cells';
import type { Choice } from '@/types/api';

type Cell = { value: unknown; tone: string; strong: boolean };
type RecordsPage_ = {
  title: string;
  note: string;
  columns: string[];
  search: boolean;
  filters: Choice[];
  count: number;
  page: number;
  pages: number;
  results: { id: number; app_link: string | null; cells: Cell[] }[];
};

const TONE: Record<string, string> = { good: 'text-leaf-ink', bad: 'text-alert-ink', warn: 'text-amber-ink', muted: 'text-muted' };

function useDebounced(v: string) {
  const [x, setX] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setX(v), 350);
    return () => clearTimeout(id);
  }, [v]);
  return x;
}

/** One console section's records, searchable and filterable, as on the website. */
function RecordsPage() {
  const t = useT();
  const params = useLocalSearchParams<{ key: string; f?: string }>();
  const [filter, setFilter] = useState(params.f ?? '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const term = useDebounced(search.trim());
  const qs = new URLSearchParams({ page: String(page), ...(filter ? { f: filter } : {}), ...(term ? { q: term } : {}) }).toString();
  const q = useResource<RecordsPage_>(`/console/records/${params.key}/?${qs}`);
  const d = q.data;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: d?.title ?? '' }} />
      {d?.note ? <Banner tone="info">{d.note}</Banner> : null}
      {d?.search ? <Field label={t('common.search')} placeholder={t('ph.common.search')} icon={icons.search} value={search} onChangeText={(v) => { setSearch(v); setPage(1); }} /> : null}
      {d?.filters.length ? <Choices scroll options={[{ key: '', label: t('common.all') }, ...d.filters]} value={filter} onChange={(k) => { setFilter(k); setPage(1); }} /> : null}
      {d ? <Small>{t('console.count', { n: d.count })}</Small> : null}
      {q.isLoading ? <Loading rows={5} /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d && !d.results.length ? <Empty title={t('common.none')} icon={icons.list} /> : null}
      {d?.results.map((r) => (
        <Card key={r.id} onPress={r.app_link ? () => router.push({ pathname: '/console/[key]/[id]', params: { key: params.key, id: r.id } }) : undefined}>
          <Text className="text-[16px] font-semibold text-navy" numberOfLines={2}>
            {cellText(r.cells[0]?.value)}
          </Text>
          {r.cells.slice(1).map((c, i) => (
            <View key={i} className="flex-row justify-between gap-3">
              <Text className="text-[13px] text-muted">{d.columns[i + 1]}</Text>
              <Text className={cx('flex-1 text-right text-[13px]', TONE[c.tone] ?? 'text-ink', c.strong && 'font-bold')} numberOfLines={2}>
                {cellText(c.value)}
              </Text>
            </View>
          ))}
        </Card>
      ))}
      {d && d.pages > 1 ? (
        <View className="flex-row items-center justify-between gap-3">
          <Button size="sm" variant="secondary" title={t('common.previous')} disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
          <Small>{t('console.page', { n: d.page, of: d.pages })}</Small>
          <Button size="sm" variant="secondary" title={t('common.next')} disabled={page >= d.pages} onPress={() => setPage((p) => p + 1)} />
        </View>
      ) : null}
    </Screen>
  );
}

export default function Records() {
  return (
    <ConsoleGate>
      <RecordsPage />
    </ConsoleGate>
  );
}
