/** A vendor's public storefront: electrika.ng/store/<slug>, on every plan. */
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { remoteImage } from '@/api/client';
import { AdBanner, ListingGrid, PaymentNotice, share, StoreLogo, VerifiedLine } from '@/components/market';
import { Body, Button, Choices, Empty, Failed, Field, IconButton, icons, Loading, Screen } from '@/components/ui';
import { useT } from '@/i18n';
import { call, whatsapp } from '@/lib/pay';
import { useAction, useResource } from '@/store/hooks';
import type { Ad, Conversation, ListingCard, Paged, VendorPublic } from '@/types/market';

type Store = Paged<ListingCard> & {
  store: VendorPublic & { listing_count: number; categories_listed: { slug: string; name: string }[] };
  ads: Ad[];
  is_mine: boolean;
};

export default function StoreScreen() {
  const t = useT();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);
  const qs = new URLSearchParams({ ...(term ? { q: term } : {}), ...(category ? { category } : {}) }).toString();
  const q = useResource<Store>(`/market/stores/${slug}/${qs ? `?${qs}` : ''}`);
  const { run, busy } = useAction();
  const s = q.data?.store;

  const message = async () => {
    const conv = await run<Conversation>('/market/conversations/', { body: { store: slug }, success: false, invalidate: ['/market/conversations/'] });
    router.push(`/market/messages/${conv.id}` as Href);
  };

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen
        options={{
          title: s?.name ?? '',
          headerRight: s ? () => <IconButton icon={{ sf: 'square.and.arrow.up', md: 'share' }} label={t('mk.storeShare')} variant="surface" onPress={() => share(s.name, s.storefront_url, t)} /> : undefined,
        }}
      />
      {q.isLoading ? <Loading hero /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {s && q.data ? (
        <>
          <View className="-mx-4 h-[130px] overflow-hidden bg-navy-fill">
            {s.cover_url ? <Image source={remoteImage(s.cover_url)} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          </View>
          <View className="-mt-10 flex-row items-end gap-3">
            <View className="rounded-2xl border-4 border-page bg-surface">
              <StoreLogo vendor={s} size={72} />
            </View>
            <View className="flex-1 gap-0.5 pb-1">
              <Text className="text-[20px] font-bold text-navy" numberOfLines={2}>
                {s.name}
              </Text>
              <VerifiedLine vendor={s} />
            </View>
          </View>
          {s.description ? <Body>{s.description}</Body> : null}
          {s.verified ? <Text className="text-[12px] text-muted">{s.verification_note}</Text> : null}
          {q.data.is_mine ? (
            <Button title={t('mk.dashboard')} variant="secondary" icon={icons.chart} onPress={() => router.push('/market/vendor' as Href)} />
          ) : (
            <View className="gap-2">
              <Button title={t('mk.messageStore')} icon={icons.send} busy={busy} onPress={message} />
              <View className="flex-row gap-2">
                {s.whatsapp ? <View className="flex-1"><Button title={t('mk.whatsapp')} size="sm" variant="secondary" onPress={() => whatsapp(s.whatsapp)} /></View> : null}
                {s.phone ? <View className="flex-1"><Button title={t('mk.call')} size="sm" variant="secondary" icon={icons.phone} onPress={() => call(s.phone)} /></View> : null}
                <View className="flex-1">
                  <Button title={s.favourite ? t('mk.storeSaved') : t('mk.saveStore')} size="sm" variant="secondary"
                    onPress={() => run(`/market/stores/${slug}/favourite/`, { success: false, invalidate: [`/market/stores/${slug}/`] })} />
                </View>
              </View>
            </View>
          )}
          {s.address ? <Text className="text-[12.5px] text-muted">{s.address}</Text> : null}
          {q.data.ads.map((ad) => <AdBanner key={ad.id} ad={ad} />)}
          <Field label={t('common.search')} icon={icons.search} value={search} onChangeText={setSearch} placeholder={t('mk.searchStore', { name: s.name })} />
          {s.categories_listed.length > 1 ? (
            <Choices scroll options={[{ key: '', label: `${t('common.all')} (${s.listing_count})` }, ...s.categories_listed.map((c) => ({ key: c.slug, label: c.name }))]}
              value={category} onChange={setCategory} />
          ) : null}
          {q.data.results.length ? <ListingGrid items={q.data.results} /> : <Empty title={t('mk.noProducts')} icon={icons.bag} />}
          <PaymentNotice />
        </>
      ) : null}
    </Screen>
  );
}
