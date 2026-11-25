/** Marketplace conversations, as a buyer and (for vendors) for the store. */
import { router, Stack, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { StoreLogo } from '@/components/market';
import { Avatar, cx, Empty, Failed, Field, icons, Loading, Screen, Segmented } from '@/components/ui';
import { useT } from '@/i18n';
import { naira, when } from '@/lib/format';
import { useResource } from '@/store/hooks';
import type { Conversation, MyStore, Paged } from '@/types/market';

export default function Inbox() {
  const t = useT();
  const [side, setSide] = useState<'' | 'vendor' | 'buyer'>('');
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);
  const store = useResource<{ store: MyStore | null }>('/market/vendor/', { refetchOnFocus: false });
  const qs = new URLSearchParams({ ...(side ? { as: side } : {}), ...(archived ? { archived: '1' } : {}), ...(term ? { q: term } : {}) }).toString();
  const q = useResource<Paged<Conversation> & { unread: number }>(`/market/conversations/${qs ? `?${qs}` : ''}`, { poll: 30_000 });

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('mk.inbox') }} />
      {store.data?.store ? (
        <Segmented options={[{ key: '', label: t('mk.all') }, { key: 'vendor', label: t('mk.asVendor') }, { key: 'buyer', label: t('mk.asBuyer') }]} value={side} onChange={setSide} />
      ) : null}
      <Field label={t('common.search')} icon={icons.search} value={search} onChangeText={setSearch} placeholder={t('mk.searchChats')} />
      {q.isLoading ? <Loading rows={4} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('mk.noChats')} icon={{ sf: 'bubble.left.and.bubble.right', md: 'forum' }} /> : null}
      <View className="gap-2">
        {q.data?.results.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`${c.side === 'BUYER' ? c.vendor.name : c.buyer.name}${c.unread ? `, ${c.unread} ${t('mk.unread')}` : ''}`}
            onPress={() => router.push(`/market/messages/${c.id}` as Href)}
            className={cx('flex-row items-center gap-3 rounded-2xl border bg-surface px-3.5 py-3 active:bg-mist', c.unread ? 'border-haze-edge' : 'border-line')}>
            {c.side === 'BUYER' ? <StoreLogo vendor={c.vendor} size={44} /> : <Avatar initials={c.buyer.name.slice(0, 1).toUpperCase()} size={44} />}
            <View className="flex-1 gap-0.5">
              <View className="flex-row items-baseline justify-between gap-2">
                <Text className="flex-1 text-[15px] font-semibold text-navy" numberOfLines={1}>
                  {c.side === 'BUYER' ? c.vendor.name : c.buyer.name}
                </Text>
                <Text className="text-[11px] text-muted">{when(c.last_message_at)}</Text>
              </View>
              {c.listing ? (
                <Text className="text-[12px] text-accent" numberOfLines={1}>
                  {c.listing.title}
                  {c.listing.price ? ` · ${naira(c.listing.price)}` : ''}
                </Text>
              ) : null}
              <Text className={cx('text-[13px]', c.unread ? 'font-semibold text-navy' : 'text-muted')} numberOfLines={1}>
                {c.agreed_price ? `✓ ${t('mk.agreed', { price: naira(c.agreed_price) })}` : c.last_message}
              </Text>
            </View>
            {c.unread ? (
              <View className="h-6 min-w-[24px] items-center justify-center rounded-full bg-alert px-1.5">
                <Text className="text-[11px] font-bold text-white">{c.unread}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => setArchived(!archived)} className="items-center py-2">
        <Text className="text-[13px] text-muted underline">{archived ? t('mk.showActive') : t('mk.showArchived')}</Text>
      </Pressable>
    </Screen>
  );
}
