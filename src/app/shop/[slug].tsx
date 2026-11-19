import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { QuoteSheet } from '@/components/shop/QuoteSheet';
import { Banner, Body, Button, Card, Failed, Heading, icons, KeyValue, Loading, Pill, Screen, Stepper } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { priceLabel } from '@/screens/customer/Shop';
import { useAppDispatch, useAppSelector, useResource } from '@/store/hooks';
import { selectCartQty } from '@/store/selectors';
import { addToCart } from '@/store/slices/cart';
import type { Product } from '@/types/api';

export default function ProductScreen() {
  const t = useT();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useResource<Product>(`/shop/${slug}/`, { auth: false });
  const dispatch = useAppDispatch();
  const p = q.data;
  const inCart = useAppSelector(selectCartQty(p?.id ?? -1));
  const [qty, setQty] = useState(1);
  const [quoting, setQuoting] = useState(false);
  const canBuy = !!p && p.buyable && p.in_stock && !p.quote_only && !p.ask_price;

  return (
    <Screen
      footer={
        p ? (
          canBuy ? (
            <View className="flex-row items-center gap-3">
              <Stepper value={qty} onChange={setQty} min={1} />
              <Button
                className="flex-1"
                title={inCart ? t('shop.addMore') : t('shop.add')}
                icon={icons.cart}
                onPress={() => {
                  dispatch(addToCart({ product: p, qty }));
                  notify.success(t('shop.added', { name: p.name }));
                  router.push('/shop/cart');
                }}
              />
            </View>
          ) : (
            <Button title={p.quote_only ? t('shop.askQuote') : t('shop.askPrice')} icon={icons.quote} onPress={() => setQuoting(true)} />
          )
        ) : null
      }>
      <Stack.Screen options={{ title: p?.category.name ?? '' }} />
      {q.isLoading ? <Loading hero /> : null}
      {q.error && !p ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {p ? (
        <>
          <View className="aspect-[4/3] w-full overflow-hidden rounded-3xl bg-mist">
            {p.image_url ? <Image source={p.image_url} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} /> : null}
          </View>
          <View className="gap-1.5">
            {p.badge_label ? <Pill label={p.badge_label} /> : null}
            <Text className="text-[24px] font-bold text-navy">{p.name}</Text>
            <Text className="text-[20px] font-bold text-brand">{priceLabel(p, t)}</Text>
            {p.summary ? <Body>{p.summary}</Body> : null}
          </View>
          {!p.in_stock ? <Banner tone="amber">{t('shop.outOfStockSub')}</Banner> : null}
          {p.fitting_available ? <Banner tone="leaf" icon={icons.wrench}>{t('shop.fittingSub')}</Banner> : null}
          {p.quote_only ? <Banner tone="info">{t('shop.quoteSub')}</Banner> : null}
          {p.description ? (
            <Card>
              <Heading>{t('shop.about')}</Heading>
              <Body>{p.description}</Body>
            </Card>
          ) : null}
          {p.specs?.length ? (
            <Card>
              <Heading>{t('shop.specs')}</Heading>
              {p.specs.map((s) => (
                <KeyValue key={s.label} label={s.label} value={s.value} />
              ))}
            </Card>
          ) : null}
          <QuoteSheet product={p} open={quoting} onClose={() => setQuoting(false)} />
        </>
      ) : null}
    </Screen>
  );
}
