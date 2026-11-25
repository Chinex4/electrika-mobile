/** ElectriKa: the vendor marketplace's home, search and filters. */
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AdBanner, ListingGrid, PaymentNotice, useMarketConfig } from '@/components/market';
import {
  Button, Check, Choices, Empty, Failed, Field, IconButton, icons, Loading, Screen, SectionLabel, Segmented, Sheet, Title,
} from '@/components/ui';
import { useT } from '@/i18n';
import { naira } from '@/lib/format';
import { useResource } from '@/store/hooks';
import type { Product } from '@/types/api';
import type { Ad, Category, ListingCard, Paged } from '@/types/market';

type Home = {
  hero: Ad[];
  banners: Ad[];
  promo_section: Ad[];
  categories: Category[];
  featured: ListingCard[];
  latest: ListingCard[];
  official: (Product & { sold_by: string })[];
  recent: ListingCard[];
};
type Results = Paged<ListingCard> & { sponsored: ListingCard[]; ads: Ad[]; category?: Category };
type Filters = { state: string; condition: string; min: string; max: string; verified: boolean; negotiable: boolean; sort: string };

const NO_FILTERS: Filters = { state: '', condition: '', min: '', max: '', verified: false, negotiable: false, sort: 'newest' };

function useDebounced(value: string, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function MarketHome() {
  const t = useT();
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const [category, setCategory] = useState(params.category ?? '');
  const [search, setSearch] = useState(params.q ?? '');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [filtering, setFiltering] = useState(false);
  const term = useDebounced(search.trim());
  const unread = useResource<{ unread: number }>('/market/unread/', { poll: 60_000 });
  const home = useResource<Home>('/market/home/');
  const config = useMarketConfig();
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const searching = !!(category || term || filtered);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (term) p.set('q', term);
    if (filters.state) p.set('state', filters.state);
    if (filters.condition) p.set('condition', filters.condition);
    if (filters.min) p.set('min_price', filters.min);
    if (filters.max) p.set('max_price', filters.max);
    if (filters.verified) p.set('verified', '1');
    if (filters.negotiable) p.set('negotiable', '1');
    if (filters.sort !== 'newest') p.set('sort', filters.sort);
    return p.toString();
  }, [category, term, filters]);
  // "Show more" adds pages under the first; a new search starts again at one.
  const [more, setMore] = useState({ qs: '', pages: 1 });
  const pageCount = more.qs === qs ? more.pages : 1;
  const results = useResource<Results>(searching ? `/market/listings/?${qs}` : null);

  const categories = home.data?.categories ?? [];
  const q = searching ? results : home;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: '' }} />
      <Title
        sub={t('mk.sub')}
        right={
          <View className="flex-row gap-2">
            <IconButton icon={{ sf: 'heart', md: 'favorite_border' }} label={t('mk.saved')} variant="surface" onPress={() => router.push('/market/saved' as Href)} />
            <IconButton icon={{ sf: 'bubble.left.and.bubble.right', md: 'forum' }} label={t('mk.messages')} variant="surface" badge={unread.data?.unread}
              onPress={() => router.push('/market/messages' as Href)} />
          </View>
        }>
        {t('mk.title')}
      </Title>
      <Segmented
        options={[{ key: 'official', label: t('mk.official') }, { key: 'market', label: t('mk.marketplace') }]}
        value="market"
        onChange={(k) => k === 'official' && (router.canGoBack() ? router.back() : router.replace('/customer/shop' as Href))}
      />
      <Field label={t('common.search')} icon={icons.search} value={search} onChangeText={setSearch} placeholder={t('mk.search')} returnKeyType="search" />
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Choices scroll options={[{ key: '', label: t('common.all') }, ...categories.map((c) => ({ key: c.slug, label: c.name }))]} value={category} onChange={setCategory} />
        </View>
        <IconButton icon={{ sf: 'slider.horizontal.3', md: 'tune' }} label={t('mk.filters')} variant={filtered ? 'primary' : 'surface'}
          onPress={() => {
            setDraft(filters);
            setFiltering(true);
          }} />
      </View>

      {q.isLoading ? <Loading rows={4} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}

      {searching && results.data ? (
        <>
          <Text className="text-[13px] text-muted">{t('mk.results', { n: results.data.count })}</Text>
          {results.data.ads.map((ad) => <AdBanner key={ad.id} ad={ad} />)}
          {results.data.sponsored.length ? <ListingGrid items={results.data.sponsored} /> : null}
          {results.data.results.length ? <ListingGrid items={results.data.results} /> : <Empty title={t('mk.none')} sub={t('mk.noneSub')} icon={icons.search} />}
          {Array.from({ length: pageCount - 1 }, (_, i) => <MorePage key={i} path={`/market/listings/?${qs}&page=${i + 2}`} />)}
          {pageCount < results.data.pages ? <Button title={t('common.next')} variant="secondary" onPress={() => setMore({ qs, pages: pageCount + 1 })} /> : null}
        </>
      ) : null}

      {!searching && home.data ? (
        <>
          {home.data.hero.length ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {home.data.hero.map((ad) => (
                <View key={ad.id} style={{ width: 340 }}>
                  <AdBanner ad={ad} tall />
                </View>
              ))}
            </ScrollView>
          ) : null}
          <SectionLabel>{t('mk.categories')}</SectionLabel>
          <View className="flex-row flex-wrap justify-between gap-y-2">
            {categories.map((c) => (
              <Pressable key={c.slug} accessibilityRole="button" onPress={() => setCategory(c.slug)} className="min-h-[52px] w-[49%] justify-center rounded-xl bg-mist px-3 active:bg-haze">
                <Text className="text-[13px] font-semibold text-navy" numberOfLines={2}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/market/sell' as Href)} className="flex-row items-center gap-3 rounded-2xl bg-navy-fill px-4 py-4 active:opacity-90">
            <View className="flex-1 gap-0.5">
              <Text className="text-[16px] font-bold text-white">{t('mk.sell')}</Text>
              <Text className="text-[13px] text-white/80">{t('mk.sellSub')}</Text>
            </View>
            <View className="rounded-full bg-white px-3 py-2">
              <Text className="text-[12.5px] font-bold text-navy-fill">{t('mk.becomeVendor')}</Text>
            </View>
          </Pressable>
          {home.data.featured.length ? (
            <>
              <SectionLabel right={<Text className="text-[11px] text-muted">{t('mk.sponsored')}</Text>}>{t('mk.featured')}</SectionLabel>
              <ListingGrid items={home.data.featured} />
            </>
          ) : null}
          {home.data.banners.map((ad) => <AdBanner key={ad.id} ad={ad} />)}
          <SectionLabel>{t('mk.latest')}</SectionLabel>
          {home.data.latest.length ? <ListingGrid items={home.data.latest} /> : <Empty title={t('mk.empty')} icon={icons.bag} />}
          {home.data.recent.length ? (
            <>
              <SectionLabel>{t('mk.recent')}</SectionLabel>
              <ListingGrid items={home.data.recent.slice(0, 4)} />
            </>
          ) : null}
          {home.data.official.length ? (
            <>
              <SectionLabel>{t('mk.fromOfficial')}</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {home.data.official.map((p) => (
                  <Pressable key={p.id} onPress={() => router.push(`/shop/${p.slug}` as Href)} className="w-[150px] overflow-hidden rounded-2xl border border-line bg-surface">
                    <View className="h-[110px] bg-white">{p.image_url ? <Image source={p.image_url} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : null}</View>
                    <View className="gap-1 p-2.5">
                      <Text className="text-[12.5px] font-semibold text-navy" numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text className="text-[12px] font-bold text-accent">{p.price ? naira(p.price) : ''}</Text>
                      <Text className="text-[10.5px] font-bold uppercase text-accent">{t('mk.soldByElectrika')}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </>
      ) : null}
      <PaymentNotice />

      <Sheet open={filtering} onClose={() => setFiltering(false)} title={t('mk.filters')}>
        <Choices label={t('mk.sort')} options={(config?.sorts ?? []).map((s) => ({ key: s.value, label: s.label }))} value={draft.sort} onChange={(sort) => setDraft({ ...draft, sort })} />
        <View className="flex-row gap-3">
          <View className="flex-1"><Field label={t('mk.minPrice')} keyboardType="number-pad" value={draft.min} onChangeText={(min) => setDraft({ ...draft, min })} /></View>
          <View className="flex-1"><Field label={t('mk.maxPrice')} keyboardType="number-pad" value={draft.max} onChangeText={(max) => setDraft({ ...draft, max })} /></View>
        </View>
        <Choices label={t('mk.condition')} scroll options={[{ key: '', label: t('mk.any') }, ...(config?.conditions ?? []).map((c) => ({ key: c.value, label: c.label }))]}
          value={draft.condition} onChange={(condition) => setDraft({ ...draft, condition })} />
        <Choices label={t('mk.state')} scroll options={[{ key: '', label: t('mk.anywhere') }, ...(config?.states ?? []).map((s) => ({ key: s, label: s }))]}
          value={draft.state} onChange={(state) => setDraft({ ...draft, state })} />
        <Check label={t('mk.verifiedOnly')} value={draft.verified} onChange={(verified) => setDraft({ ...draft, verified })} />
        <Check label={t('mk.offersOnly')} value={draft.negotiable} onChange={(negotiable) => setDraft({ ...draft, negotiable })} />
        <View className="flex-row gap-3">
          <View className="flex-1"><Button title={t('mk.clear')} variant="secondary" onPress={() => { setFilters(NO_FILTERS); setFiltering(false); }} /></View>
          <View className="flex-1"><Button title={t('mk.apply')} onPress={() => { setFilters(draft); setFiltering(false); }} /></View>
        </View>
      </Sheet>
    </Screen>
  );
}

/** One more page of results, below the first. */
function MorePage({ path }: { path: string }) {
  const q = useResource<Results>(path);
  if (q.isLoading) return <Loading rows={2} />;
  return q.data ? <ListingGrid items={q.data.results} /> : null;
}
