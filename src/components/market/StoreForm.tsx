/** The store details form, for opening a store and for editing it. */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { photoPart, remoteImage } from '@/api/client';
import { Button, Check, Choices, Field, pickPhoto } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { Category, MyStore } from '@/types/market';

import { useMarketConfig } from './index';

type Values = {
  name: string;
  slug: string;
  description: string;
  state: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_email: boolean;
  categories: string[];
};

export function StoreForm({ store, defaults, submitLabel, onSaved }: {
  store?: MyStore | null;
  defaults?: Partial<Values>;
  submitLabel: string;
  onSaved: (store: MyStore) => void;
}) {
  const t = useT();
  const config = useMarketConfig();
  const cats = useResource<{ results: Category[] }>('/market/categories/', { auth: false, refetchOnFocus: false });
  const { run, busy } = useAction();
  const [v, setV] = useState<Values>({
    name: store?.name ?? '',
    slug: store?.slug ?? '',
    description: store?.description ?? '',
    state: store?.state ?? '',
    city: store?.city ?? '',
    address: store?.address ?? '',
    phone: store?.phone ?? '',
    whatsapp: store?.whatsapp ?? '',
    email: store?.email ?? '',
    show_phone: store?.show_phone ?? true,
    show_whatsapp: store?.show_whatsapp ?? true,
    show_email: store?.show_email ?? false,
    categories: (store?.category_ids ?? []).map(String),
    ...defaults,
  });
  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Values>(k: K) => (value: Values[K]) => setV((old) => ({ ...old, [k]: value }));

  const save = async () => {
    const form = new FormData();
    for (const [k, value] of Object.entries(v)) {
      if (k === 'categories') (value as string[]).forEach((c) => form.append('categories', c));
      else form.append(k, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));
    }
    if (logo) form.append('logo', photoPart(logo, 'logo.jpg'));
    if (cover) form.append('cover', photoPart(cover, 'cover.jpg'));
    try {
      const res = await run<{ store: MyStore }>('/market/vendor/', { method: store ? 'PATCH' : 'POST', body: form, toastError: false,
        success: store ? t('mk.saved.ok') : t('mk.storeOpen'), invalidate: ['/market/'] });
      setErrors({});
      onSaved(res.store);
    } catch (e) {
      setErrors(fieldErrors(e));
      const first = Object.values(fieldErrors(e))[0] ?? (e as { message?: string }).message;
      if (first) notify.error(first);
    }
  };

  return (
    <View className="gap-3">
      <Field label={t('mk.businessName')} value={v.name} onChangeText={set('name')} error={errors.name} autoComplete="organization" />
      <Field label={t('mk.storeAddress')} value={v.slug} onChangeText={(s) => set('slug')(s.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        hint={t('mk.storeAddressHint')} error={errors.slug} autoCapitalize="none" autoCorrect={false} />
      <Field label={t('mk.aboutBusiness')} value={v.description} onChangeText={set('description')} multiline error={errors.description} />
      <Choices label={t('mk.state')} scroll options={(config?.states ?? []).map((s) => ({ key: s, label: s }))} value={v.state} onChange={set('state')} error={errors.state} />
      <Field label={t('mk.city')} value={v.city} onChangeText={set('city')} error={errors.city} />
      <Field label={t('mk.shopAddress')} value={v.address} onChangeText={set('address')} />
      <Field label={t('mk.businessPhone')} value={v.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
      <Field label={t('mk.whatsapp')} value={v.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" error={errors.whatsapp} />
      <Field label={t('mk.businessEmail')} value={v.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      <Text className="text-sm font-semibold text-navy">{t('mk.showBuyers')}</Text>
      <Check label={t('mk.showPhone')} value={v.show_phone} onChange={set('show_phone')} />
      <Check label={t('mk.showWhatsapp')} value={v.show_whatsapp} onChange={set('show_whatsapp')} />
      <Check label={t('mk.showEmail')} value={v.show_email} onChange={set('show_email')} />
      <Choices label={t('mk.whatYouSell')} options={(cats.data?.results ?? []).map((c) => ({ key: String(c.id), label: c.name }))} value={v.categories}
        onChange={(k) => set('categories')(v.categories.includes(k) ? v.categories.filter((c) => c !== k) : [...v.categories, k])} error={errors.categories} />
      <View className="flex-row gap-3">
        {([['logo', logo, setLogo, store?.logo_url], ['cover', cover, setCover, store?.cover_url]] as const).map(([key, local, setLocal, current]) => (
          <View key={key} className="flex-1 gap-1.5">
            <Text className="text-sm font-semibold text-navy">{key === 'logo' ? t('mk.logo') : t('mk.cover')}</Text>
            {local || current ? (
              <Image source={local ? local : remoteImage(current!)} style={{ width: '100%', aspectRatio: key === 'logo' ? 1 : 8 / 3, borderRadius: 12 }} contentFit="cover" />
            ) : null}
            <Button title={local || current ? t('mk.change') : t('mk.choose')} size="sm" variant="secondary"
              onPress={async () => {
                const uri = await pickPhoto('library', key === 'logo');
                if (uri) setLocal(uri);
              }} />
          </View>
        ))}
      </View>
      <Button title={submitLabel} busy={busy} onPress={save} />
    </View>
  );
}
