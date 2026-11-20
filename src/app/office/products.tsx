import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Card, Choices, Empty, Failed, Field, IconButton, icons, Loading, Pill, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { naira } from '@/lib/format';
import { useAction, useResource } from '@/store/hooks';
import type { Choice, Product } from '@/types/api';
import { useColors } from '@/theme';

export type StaffProduct = Product & { active: boolean; sort: number; specs_text: string };
type ProductsList = { show: string; shows: Choice[]; categories: { id: number; name: string; n: number }[]; results: StaffProduct[] };

/** The Shop's products, for the Program Manager and Account Managers: stock and visibility in one tap. */
export default function Products() {
  const colors = useColors();
  const t = useT();
  const [show, setShow] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);
  const path = `/office/products/?${new URLSearchParams({ show, ...(term ? { q: term } : {}) })}`;
  const q = useResource<ProductsList>(path);
  const { run } = useAction();
  const flip = (p: StaffProduct, field: 'in_stock' | 'active', v: boolean) => {
    run(`/office/products/${p.id}/`, { method: 'PATCH', body: { [field]: v }, invalidate: ['/office/products/', '/shop/'], success: false }).catch(() => undefined);
  };

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('am.products'), headerRight: () => <IconButton icon={icons.plus} label={t('products.add')} variant="primary" onPress={() => router.push('/office/product/new')} /> }} />
      <Field label={t('common.search')} placeholder={t('ph.common.search')} icon={icons.search} value={search} onChangeText={setSearch} />
      {q.data ? <Choices scroll options={q.data.shows} value={show} onChange={setShow} /> : null}
      {q.isLoading ? <Loading rows={5} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('shop.none')} icon={icons.tag} /> : null}
      {q.data?.results.map((p) => (
        <Card key={p.id} onPress={() => router.push(`/office/product/${p.id}`)}>
          <View className="flex-row gap-3">
            <View className="h-14 w-14 overflow-hidden rounded-xl bg-mist">
              {p.image_url ? <Image source={p.image_url} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-[15px] font-semibold text-navy" numberOfLines={2}>{p.name}</Text>
              <Small>{[p.category.name, p.quote_only ? t('shop.askQuote') : p.price ? naira(p.price) : t('products.noPrice')].join(' · ')}</Small>
              {!p.active ? <Pill label={t('products.hidden')} tone="grey" /> : null}
            </View>
          </View>
          <View className="flex-row items-center justify-between border-t border-line/70 pt-2">
            <View className="flex-row items-center gap-2">
              <Switch value={p.in_stock} onValueChange={(v) => flip(p, 'in_stock', v)} trackColor={{ true: colors.leaf, false: colors.edge }} />
              <Small>{t('products.inStock')}</Small>
            </View>
            <View className="flex-row items-center gap-2">
              <Switch value={p.active} onValueChange={(v) => flip(p, 'active', v)} trackColor={{ true: colors.brand, false: colors.edge }} />
              <Small>{t('products.inShop')}</Small>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
