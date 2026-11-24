import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Banner, Between, Button, Card, Empty, Icon, icons, Screen, Small, Spinner, Stepper } from '@/components/ui';
import { useT } from '@/i18n';
import { naira } from '@/lib/format';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectCartItems, selectPricedCart } from '@/store/selectors';
import { priceCart, removeFromCart, setQty } from '@/store/slices/cart';
import { useColors } from '@/theme';

/** The cart, priced by the server every time it changes. */
export default function Cart() {
  const colors = useColors();
  const t = useT();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const priced = useAppSelector(selectPricedCart);
  const pricing = useAppSelector((s) => s.cart.pricing);
  const key = items.map((i) => `${i.product_id}x${i.qty}`).join(',');

  useEffect(() => {
    if (key) dispatch(priceCart());
  }, [key, dispatch]);

  const lineTotal = (id: number) => priced?.lines.find((l) => l.product.id === id)?.total;

  return (
    <Screen
      footer={
        items.length ? (
          <View className="gap-2">
            <Between>
              <Text className="text-[15px] text-muted">{t('shop.subtotal')}</Text>
              <Text className="text-[20px] font-bold text-navy">{priced ? naira(priced.subtotal) : '…'}</Text>
            </Between>
            <Button title={t('shop.checkout')} icon={icons.card} disabled={pricing || !priced} onPress={() => router.push('/shop/checkout')} />
          </View>
        ) : null
      }>
      <Stack.Screen options={{ title: t('shop.cart') }} />
      {!items.length ? (
        <Empty title={t('shop.cartEmpty')} sub={t('shop.cartEmptySub')} icon={icons.cart} action={<Button title={t('shop.browse')} onPress={() => router.back()} />} />
      ) : null}
      {items.map((i) => (
        <Card key={i.product_id}>
          <View className="flex-row gap-3">
            <View className="h-16 w-16 overflow-hidden rounded-xl bg-mist">
              {i.image_url ? <Image source={i.image_url} style={{ width: '100%', height: '100%', backgroundColor: '#FFFFFF' }} contentFit="contain" /> : null}
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-[15px] font-semibold text-navy" numberOfLines={2}>
                {i.name}
              </Text>
              <Small>{naira(lineTotal(i.product_id) ?? (i.price ? Number(i.price) * i.qty : null))}</Small>
            </View>
            <Pressable accessibilityLabel={t('common.remove')} onPress={() => dispatch(removeFromCart(i.product_id))} className="h-8 w-8 items-center justify-center">
              <Icon name={icons.trash} size={16} color={colors.faint} />
            </Pressable>
          </View>
          <View className="items-end">
            <Stepper value={i.qty} onChange={(qty) => dispatch(setQty({ productId: i.product_id, qty }))} min={0} />
          </View>
        </Card>
      ))}
      {pricing && !priced ? <Spinner /> : null}
      {items.length ? <Banner tone="info">{t('shop.deliveryNext')}</Banner> : null}
    </Screen>
  );
}
