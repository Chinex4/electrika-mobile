/** The vendor's listings: status, numbers, and quick actions. */
import { Image } from 'expo-image';
import { router, Stack, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { remoteImage } from '@/api/client';
import { VendorTabs } from '@/components/market/VendorTabs';
import { Button, Choices, Empty, Failed, icons, Loading, Pill, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { naira } from '@/lib/format';
import { useAction, useResource } from '@/store/hooks';
import type { MyListing, Paged } from '@/types/market';

const TONE: Record<string, 'leaf' | 'amber' | 'alert' | 'grey'> = {
  PUBLISHED: 'leaf', PENDING: 'amber', DRAFT: 'grey', REJECTED: 'alert', SUSPENDED: 'alert', ARCHIVED: 'grey',
};

export default function MyListings() {
  const t = useT();
  const [status, setStatus] = useState('');
  const q = useResource<Paged<MyListing>>(`/market/vendor/listings/${status ? `?status=${status}` : ''}`);
  const { run } = useAction();
  const act = (item: MyListing, action: string) =>
    run(`/market/vendor/listings/${item.id}/${action}/`, { success: false, invalidate: ['/market/vendor/', '/market/listings/', '/market/home/'] });

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: '' }} />
      <Title right={<Button title={t('mk.addProduct')} size="sm" icon={icons.plus} onPress={() => router.push('/market/vendor/listing/new' as Href)} />}>{t('mk.listings')}</Title>
      <VendorTabs here="listings" />
      <Choices scroll value={status} onChange={setStatus} options={[
        { key: '', label: t('mk.all') }, { key: 'PUBLISHED', label: t('mk.st.published') }, { key: 'PENDING', label: t('mk.st.pending') },
        { key: 'DRAFT', label: t('mk.st.draft') }, { key: 'REJECTED', label: t('mk.st.rejected') }, { key: 'ARCHIVED', label: t('mk.st.archived') },
      ]} />
      {q.isLoading ? <Loading rows={4} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('mk.noListings')} icon={icons.tag} /> : null}
      {q.data?.results.map((item) => (
        <View key={item.id} className="gap-2 rounded-2xl border border-line bg-surface p-3">
          <Pressable className="flex-row gap-3" onPress={() => router.push(`/market/vendor/listing/${item.id}` as Href)}>
            <View className="h-16 w-16 overflow-hidden rounded-xl bg-white">
              {item.image_url ? <Image source={remoteImage(item.image_url)} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : null}
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-[14px] font-semibold text-navy" numberOfLines={2}>{item.title}</Text>
              <Text className="text-[13px] text-ink">{naira(item.price)} · {t('mk.stock', { n: item.stock })}</Text>
              <View className="flex-row flex-wrap items-center gap-1.5">
                <Pill label={item.status_label} tone={TONE[item.status] ?? 'grey'} />
                <Text className="text-[11.5px] text-muted">{t('mk.clicks', { v: String(item.views), c: String(item.enquiries) })}</Text>
              </View>
              {item.moderation_note ? <Text className="text-[12px] text-amber-ink">{item.moderation_note}</Text> : null}
            </View>
          </Pressable>
          <View className="flex-row flex-wrap gap-2">
            {item.status === 'PUBLISHED' ? (
              <>
                <Button title={t('mk.view')} size="sm" variant="secondary" onPress={() => router.push(`/market/item/${item.slug}` as Href)} />
                <Button title={t('mk.promote')} size="sm" variant="secondary" onPress={() => router.push(`/market/vendor/promotions?listing=${item.id}` as Href)} />
                <Button title={item.available_flag ? t('mk.markSoldOut') : t('mk.markAvailable')} size="sm" variant="secondary" onPress={() => act(item, item.available_flag ? 'unavailable' : 'available')} />
                <Button title={t('mk.archiveIt')} size="sm" variant="secondary" onPress={() => act(item, 'archive')} />
              </>
            ) : null}
            {item.status === 'ARCHIVED' ? <Button title={t('mk.restore')} size="sm" variant="secondary" onPress={() => act(item, 'restore')} /> : null}
            {['ARCHIVED', 'DRAFT', 'REJECTED'].includes(item.status) ? (
              <Button title={t('mk.delete')} size="sm" variant="secondary"
                onPress={() => Alert.alert(t('mk.delete'), t('mk.deleteConfirm'), [
                  { text: t('mk.cancel'), style: 'cancel' },
                  { text: t('mk.delete'), style: 'destructive', onPress: () => act(item, 'delete') },
                ])} />
            ) : null}
          </View>
        </View>
      ))}
    </Screen>
  );
}
