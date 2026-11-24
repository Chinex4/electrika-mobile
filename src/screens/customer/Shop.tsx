import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Choices, cx, Empty, Failed, Field, Icon, IconButton, icons, Loading, Pill, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { naira } from '@/lib/format';
import { notify } from '@/lib/toast';
import { useAppDispatch, useAppSelector, useResource } from '@/store/hooks';
import { selectCartCount, selectCartQty } from '@/store/selectors';
import { addToCart } from '@/store/slices/cart';
import type { Product } from '@/types/api';
import { useColors } from '@/theme';

type Catalogue = { categories: { slug: string; name: string }[]; results: Product[] };

export function priceLabel(p: Product, t: (k: string) => string) {
  if (p.quote_only) return t('shop.askQuote');
  if (p.ask_price || !p.price) return t('shop.askPrice');
  return naira(p.price);
}

function useDebounced(value: string, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** The Shop: certified parts, delivered or fitted. */
export function ShopScreen() {
  const t = useT();
  const count = useAppSelector(selectCartCount);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim());
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (term) params.set('q', term);
  const qs = params.toString();
  const q = useResource<Catalogue>(`/shop/${qs ? `?${qs}` : ''}`, { auth: false });

  return (
    <Screen tabbed refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Title
        sub={t('shop.sub')}
        right={<IconButton icon={icons.cart} label={t('shop.cart')} variant="surface" badge={count} onPress={() => router.push('/shop/cart')} />}>
        {t('tab.shop')}
      </Title>
      <Field label={t('common.search')} icon={icons.search} value={search} onChangeText={setSearch} placeholder={t('shop.searchHint')} returnKeyType="search" />
      <Choices scroll options={[{ key: '', label: t('common.all') }, ...(q.data?.categories ?? []).map((c) => ({ key: c.slug, label: c.name }))]} value={category} onChange={setCategory} />
      {q.isLoading ? <Loading rows={4} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('shop.none')} icon={icons.bag} /> : null}
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {q.data?.results.map((p) => <ProductTile key={p.id} p={p} />)}
      </View>
    </Screen>
  );
}

function ProductTile({ p }: { p: Product }) {
  const colors = useColors();
  const t = useT();
  const dispatch = useAppDispatch();
  const inCart = useAppSelector(selectCartQty(p.id));
  const canAdd = p.buyable && p.in_stock && !p.quote_only && !p.ask_price;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/shop/${p.slug}`)}
      className="w-[48.5%] overflow-hidden rounded-2xl border border-line bg-surface active:opacity-90">
      <View className="aspect-square w-full bg-mist">
        {p.image_url ? <Image source={p.image_url} style={{ width: '100%', height: '100%', backgroundColor: '#FFFFFF' }} contentFit="contain" transition={150} /> : null}
        {p.badge_label ? (
          <View className="absolute left-2 top-2">
            <Pill label={p.badge_label} tone="brand" />
          </View>
        ) : null}
      </View>
      <View className="gap-1 p-3">
        <Text className="text-sm font-semibold text-navy" numberOfLines={2}>
          {p.name}
        </Text>
        <View className="flex-row items-center justify-between gap-1">
          <Text className={cx('flex-1 text-sm font-bold', p.quote_only || p.ask_price ? 'text-muted' : 'text-accent')} numberOfLines={1}>
            {priceLabel(p, t)}
          </Text>
          {canAdd ? (
            <Pressable
              accessibilityLabel={t('shop.add')}
              onPress={() => {
                dispatch(addToCart({ product: p }));
                notify.success(t('shop.added', { name: p.name }));
              }}
              className={cx('h-8 w-8 items-center justify-center rounded-full', inCart ? 'bg-leaf' : 'bg-brand')}>
              <Icon name={inCart ? { sf: 'checkmark', md: 'check' } : icons.plus} size={14} color={colors.white} />
            </Pressable>
          ) : null}
        </View>
        {!p.in_stock ? <Pill label={t('shop.outOfStock')} tone="grey" /> : null}
      </View>
    </Pressable>
  );
}
