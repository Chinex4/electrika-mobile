import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import { Banner, Between, Button, Card, Divider, ErrorText, Field, Heading, icons, KeyValue, OptionCards, Screen, SectionLabel, Toggle } from '@/components/ui';
import { useT } from '@/i18n';
import { useConfig } from '@/lib/config';
import { naira } from '@/lib/format';
import { openCheckout } from '@/lib/pay';
import { notify } from '@/lib/toast';
import { fieldErrors, useAction, useAppDispatch, useAppSelector, useResource } from '@/store/hooks';
import { selectCartItems, selectPricedCart, selectUser } from '@/store/selectors';
import { clearCart } from '@/store/slices/cart';
import type { ApiFailure, Order } from '@/types/api';

type Delivery = { zone: { fee: string; days: string } | null; card_ready: boolean };

/** Checkout: delivery or pickup, then card (Paystack) or bank transfer. */
export default function Checkout() {
  const t = useT();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const items = useAppSelector(selectCartItems);
  const priced = useAppSelector(selectPricedCart);
  const config = useConfig();
  const { run, busy } = useAction();
  const [form, setForm] = useState({
    method: 'DELIVER' as 'DELIVER' | 'PICKUP',
    payment: 'CARD' as 'CARD' | 'TRANSFER',
    name: user?.name ?? '',
    phone: user?.phone_number ?? '',
    email: user?.email ?? '',
    area: '',
    address: '',
    landmark: '',
    fitting: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const delivery = useResource<Delivery>(`/shop/delivery/?area=${form.area}`, { auth: false });
  const fee = form.method === 'DELIVER' ? Number(delivery.data?.zone?.fee ?? 0) : 0;
  const subtotal = Number(priced?.subtotal ?? 0);
  const anyFitting = priced?.lines.some((l) => l.product.fitting_available);

  async function place() {
    setErrors({});
    setError('');
    try {
      const res = await run<{ order: Order; checkout_url: string | null; payment_error?: string }>('/shop/checkout/', {
        body: { ...form, items: items.map(({ product_id, qty }) => ({ product_id, qty })) },
        auth: !!user,
        success: false,
        toastError: false,
        invalidate: ['/shop/orders/', '/customer/activity/'],
      });
      dispatch(clearCart());
      if (res.checkout_url) {
        const result = await openCheckout(res.checkout_url);
        if (result === 'paid') notify.success(t('pay.paid'));
        else if (result === 'failed') notify.error(t('pay.failed'));
        else notify.info(t('pay.notYet'));
      } else if (res.payment_error) {
        notify.warning(res.payment_error);
      } else {
        notify.success(t('shop.placed', { n: res.order.number }));
      }
      router.dismissAll();
      router.push(`/shop/order/${res.order.token}`);
    } catch (e) {
      const f = fieldErrors(e);
      setErrors(f);
      setError(Object.keys(f).length ? t('form.checkFields') : (e as ApiFailure).message);
    }
  }

  return (
    <Screen
      footer={
        <View className="gap-2">
          <Between>
            <Text className="text-[15px] text-muted">{t('shop.total')}</Text>
            <Text className="text-[20px] font-bold text-navy">{naira(subtotal + fee)}</Text>
          </Between>
          <Button title={form.payment === 'CARD' ? t('shop.payNow') : t('shop.placeOrder')} icon={form.payment === 'CARD' ? icons.card : icons.send} busy={busy} onPress={place} size="lg" />
        </View>
      }>
      <Stack.Screen options={{ title: t('shop.checkout') }} />
      <OptionCards
        label={t('shop.howGet')}
        value={form.method}
        onChange={set('method')}
        options={[
          { key: 'DELIVER', label: t('shop.deliver'), hint: t('shop.deliverSub'), icon: icons.truck },
          { key: 'PICKUP', label: t('shop.pickup'), hint: t('shop.pickupSub'), icon: icons.building },
        ]}
      />
      {form.method === 'DELIVER' ? (
        <Card>
          <SelectField label={t('form.area')} value={form.area} onChange={set('area')} options={(config.data?.areas ?? []).map((a) => ({ key: a.key, label: a.label }))} error={errors.area} />
          {delivery.data?.zone ? <Banner tone="leaf" icon={icons.truck}>{t('shop.deliveryFee', { fee: naira(delivery.data.zone.fee), days: delivery.data.zone.days })}</Banner> : null}
          <Field label={t('shop.address')} placeholder={t('ph.shop.address')} value={form.address} onChangeText={set('address')} autoComplete="street-address" error={errors.address} />
          <Field label={t('form.landmark')} value={form.landmark} onChangeText={set('landmark')} placeholder={t('form.landmarkHint')} />
        </Card>
      ) : null}
      <SectionLabel>{t('shop.yourDetails')}</SectionLabel>
      <Card>
        <Field label={t('auth.name')} placeholder={t('ph.auth.name')} value={form.name} onChangeText={set('name')} autoComplete="name" error={errors.name} />
        <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
        <Field label={t('shop.receiptEmail')} placeholder={t('ph.shop.receiptEmail')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email} />
      </Card>
      {anyFitting ? (
        <Card>
          <Toggle label={t('shop.addFitting')} sub={t('shop.addFittingSub')} value={form.fitting} onChange={set('fitting')} />
        </Card>
      ) : null}
      <OptionCards
        label={t('shop.howPay')}
        value={form.payment}
        onChange={set('payment')}
        error={errors.payment}
        options={[
          { key: 'CARD', label: t('shop.payCard'), hint: delivery.data && !delivery.data.card_ready ? t('shop.cardOff') : t('shop.payCardSub'), icon: icons.card },
          { key: 'TRANSFER', label: t('shop.payTransfer'), hint: t('shop.payTransferSub'), icon: icons.money },
        ]}
      />
      <Card>
        <Heading>{t('shop.summary')}</Heading>
        {priced?.lines.map((l) => (
          <KeyValue key={l.product.id} label={`${l.qty} × ${l.product.name}`} value={naira(l.total)} />
        ))}
        <Divider />
        <KeyValue label={t('shop.subtotal')} value={naira(subtotal)} />
        {form.method === 'DELIVER' ? <KeyValue label={t('shop.delivery')} value={delivery.data?.zone ? naira(fee) : t('shop.chooseArea')} /> : null}
        <KeyValue label={t('shop.total')} value={naira(subtotal + fee)} strong />
      </Card>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
