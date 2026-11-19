import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { shallowEqual } from 'react-redux';

import { Button, Card, Empty, Failed, Heading, icons, Loading, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { ago } from '@/lib/format';
import { openPage } from '@/lib/pay';
import { routeForNotification } from '@/notifications/route';
import { useAppSelector, useResource } from '@/store/hooks';
import { selectRole } from '@/store/selectors';
import type { Notice, Paged } from '@/types/api';

/** Messages we've sent this person, newest first; each opens the screen it's about. */
export default function Notifications() {
  const t = useT();
  const role = useAppSelector(selectRole);
  const [page, setPage] = useState(1);
  const q = useResource<Paged<Notice>>(`/me/notifications/?page=${page}`);
  // Every page loaded so far, in order, from the store.
  const pages = useAppSelector(
    (s) => Array.from({ length: page }, (_, i) => s.resources.entries[`/me/notifications/?page=${i + 1}`]?.data as Paged<Notice> | undefined),
    shallowEqual,
  );
  const seen = new Set<number>();
  const all = pages.flatMap((p) => p?.results ?? []).filter((n) => !seen.has(n.id) && !!seen.add(n.id));

  const open = (n: Notice) => {
    const to = role ? routeForNotification(n.action_path, role) : null;
    if (to) router.push(to);
    else if (n.action_url) openPage(n.action_url);
  };

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => { setPage(1); q.refetch(); }}>
      <Stack.Screen options={{ title: t('me.notifications') }} />
      {q.isLoading && !all.length ? <Loading /> : null}
      {q.error && !all.length ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !all.length ? <Empty title={t('notes.none')} icon={icons.bell} /> : null}
      {all.map((n) => (
        <Card key={n.id} onPress={n.action_path || n.action_url ? () => open(n) : undefined}>
          <Heading className="text-[16px]">{n.subject || n.category}</Heading>
          {n.body ? <Small lines={4}>{n.body}</Small> : null}
          <Small>{ago(n.sent_at)}</Small>
        </Card>
      ))}
      {q.data?.next ? <Button title={t('notes.more')} variant="secondary" onPress={() => setPage(q.data!.next!)} /> : null}
    </Screen>
  );
}
