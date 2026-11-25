/** Add or edit a listing (id "new" adds one). Technical details follow the chosen category. */
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { photoPart, remoteImage } from '@/api/client';
import { useMarketConfig } from '@/components/market';
import { Banner, Button, Check, Choices, Failed, Field, icons, Loading, pickPhoto, Pill, Screen, SectionLabel } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { Category, MyListing, MyStore } from '@/types/market';

type Values = {
  title: string; category: string; brand_name: string; model_number: string; manufacturer: string; description: string;
  price: string; stock: string; negotiable: boolean; available: boolean; condition: string; warranty: string; state: string; city: string;
};

export default function ListingForm() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const store = useResource<{ store: MyStore | null }>('/market/vendor/', { refetchOnFocus: false });
  const existing = useResource<MyListing>(isNew ? null : `/market/vendor/listings/${id}/`);
  const item = existing.data;
  const s = store.data?.store;
  let initial: Values | null = null;
  if (isNew && s) {
    initial = { title: '', category: '', brand_name: '', model_number: '', manufacturer: '', description: '', price: '', stock: '1',
      negotiable: true, available: true, condition: 'NEW', warranty: '', state: s.state, city: s.city };
  } else if (item) {
    initial = { title: item.title, category: String(item.category_id), brand_name: item.brand_name, model_number: item.model_number,
      manufacturer: item.manufacturer, description: item.description, price: item.price, stock: String(item.stock),
      negotiable: item.negotiable, available: item.available_flag, condition: item.condition, warranty: item.warranty,
      state: item.state, city: item.city };
  }
  return (
    <>
      <Stack.Screen options={{ title: isNew ? t('mk.addProduct') : t('mk.edit') }} />
      {initial ? (
        <Editor key={item ? `${item.id}-${item.updated_at}` : 'new'} id={id} isNew={isNew} item={item} initial={initial}
          canAdd={!!s?.can_add_listing || !!(item && ['PUBLISHED', 'PENDING'].includes(item.status))} refetch={existing.refetch} />
      ) : (
        <Screen>
          {store.isLoading || existing.isLoading ? <Loading rows={5} /> : null}
          {existing.error ? <Failed error={existing.error} onRetry={existing.refetch} /> : null}
        </Screen>
      )}
    </>
  );
}

function Editor({ id, isNew, item, initial, canAdd, refetch }: {
  id: string; isNew: boolean; item?: MyListing; initial: Values; canAdd: boolean; refetch: () => void;
}) {
  const t = useT();
  const config = useMarketConfig();
  const cats = useResource<{ results: Category[] }>('/market/categories/', { auth: false, refetchOnFocus: false });
  const { run, busy } = useAction();
  const [v, setV] = useState<Values>(initial);
  const [specs, setSpecs] = useState<Record<string, string>>(item?.specs_values ?? {});
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const category = useMemo(() => cats.data?.results.find((c) => String(c.id) === v.category), [cats.data, v.category]);
  const set = <K extends keyof Values>(k: K) => (value: Values[K]) => setV((old) => ({ ...old, [k]: value }));

  const save = async (submit: boolean) => {
    const form = new FormData();
    for (const [k, value] of Object.entries(v)) form.append(k, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));
    for (const f of category?.spec_fields ?? []) form.append(`spec_${f.key}`, specs[f.key] ?? '');
    photos.forEach((uri, i) => form.append('images', photoPart(uri, `photo-${i}.jpg`)));
    form.append('submit', submit ? 'true' : 'false');
    try {
      const res = await run<MyListing>(isNew ? '/market/vendor/listings/' : `/market/vendor/listings/${id}/`, {
        method: isNew ? 'POST' : 'PATCH', body: form, toastError: false, success: false,
        invalidate: ['/market/vendor/', '/market/listings/', '/market/home/', '/market/stores/'],
      });
      setErrors({});
      setPhotos([]);
      notify.success(res.status === 'PUBLISHED' ? t('mk.published') : res.status === 'PENDING' ? t('mk.pending') : t('mk.drafted'));
      if (isNew) router.replace(`/market/vendor/listing/${res.id}` as Href);
      else refetch();
    } catch (e) {
      const errs = fieldErrors(e);
      setErrors(errs);
      notify.error((e as { message?: string }).message ?? Object.values(errs)[0] ?? '');
    }
  };

  const removeImage = (imageId: number) =>
    run(`/market/vendor/listings/${id}/images/${imageId}/`, { method: 'DELETE', success: false, invalidate: [`/market/vendor/listings/${id}/`] });

  return (
    <Screen
      footer={(
        <View className="flex-row gap-2">
          <View className="flex-1"><Button title={t('mk.saveDraft')} variant="secondary" busy={busy} onPress={() => save(false)} /></View>
          <View className="flex-1"><Button title={item?.status === 'PUBLISHED' ? t('mk.saveChanges') : t('mk.publish')} busy={busy} disabled={!canAdd} onPress={() => save(true)} /></View>
        </View>
      )}>
      {item ? (
        <View className="flex-row flex-wrap items-center gap-2">
          <Pill label={item.status_label} tone={item.status === 'PUBLISHED' ? 'leaf' : item.status === 'PENDING' ? 'amber' : 'grey'} />
          <Pressable onPress={() => router.push(`/market/item/${item.slug}` as Href)}><Text className="text-[13px] font-semibold text-accent">{t('mk.view')} →</Text></Pressable>
        </View>
      ) : null}
      {item?.moderation_note ? <Banner tone="amber">{item.moderation_note}</Banner> : null}
      {!canAdd ? <Banner tone="amber">{t('mk.limitReached')}</Banner> : null}
      {(
        <>
          <Field label={t('mk.productName')} value={v.title} onChangeText={set('title')} error={errors.title} maxLength={140} />
          <Choices label={t('mk.category')} options={(cats.data?.results ?? []).map((c) => ({ key: String(c.id), label: c.name }))} value={v.category}
            onChange={set('category')} error={errors.category} />
          <View className="flex-row gap-3">
            <View className="flex-1"><Field label={t('mk.brand')} value={v.brand_name} onChangeText={set('brand_name')} /></View>
            <View className="flex-1"><Field label={t('mk.model')} value={v.model_number} onChangeText={set('model_number')} autoCapitalize="characters" /></View>
          </View>
          <Field label={t('mk.manufacturer')} value={v.manufacturer} onChangeText={set('manufacturer')} />
          {category?.spec_fields?.length ? (
            <View className="gap-3 rounded-2xl bg-mist p-3">
              <Text className="text-sm font-semibold text-navy">{t('mk.techDetails')}</Text>
              {category.spec_fields.map((f) =>
                f.kind === 'CHOICE' ? (
                  <Choices key={f.key} label={`${f.label}${f.unit ? ` (${f.unit})` : ''}${f.required ? ' *' : ''}`} options={f.choices.map((c) => ({ key: c, label: c }))}
                    value={specs[f.key] ?? ''} onChange={(c) => setSpecs({ ...specs, [f.key]: specs[f.key] === c ? '' : c })} />
                ) : (
                  <Field key={f.key} label={`${f.label}${f.unit ? ` (${f.unit})` : ''}${f.required ? ' *' : ''}`} value={specs[f.key] ?? ''}
                    keyboardType={f.kind === 'NUMBER' ? 'decimal-pad' : 'default'} onChangeText={(x) => setSpecs({ ...specs, [f.key]: x })} />
                ),
              )}
              {errors.specs ? <Text className="text-sm text-alert-ink">{errors.specs}</Text> : null}
            </View>
          ) : null}
          <Field label={t('mk.description')} value={v.description} onChangeText={set('description')} multiline placeholder={t('mk.descriptionHint')} error={errors.description} />
          <View className="flex-row gap-3">
            <View className="flex-1"><Field label={t('mk.price')} value={v.price} onChangeText={set('price')} keyboardType="decimal-pad" error={errors.price} /></View>
            <View className="flex-1"><Field label={t('mk.inStock')} value={v.stock} onChangeText={set('stock')} keyboardType="number-pad" error={errors.stock} /></View>
          </View>
          <Check label={t('mk.buyersOffer')} value={v.negotiable} onChange={set('negotiable')} />
          <Check label={t('mk.availableNow')} value={v.available} onChange={set('available')} />
          <Choices label={t('mk.condition')} options={(config?.conditions ?? []).map((c) => ({ key: c.value, label: c.label }))} value={v.condition} onChange={set('condition')} />
          <Field label={t('mk.warranty')} value={v.warranty} onChangeText={set('warranty')} />
          <Choices label={t('mk.itemState')} scroll options={(config?.states ?? []).map((s) => ({ key: s, label: s }))} value={v.state} onChange={set('state')} error={errors.state} />
          <Field label={t('mk.city')} value={v.city} onChangeText={set('city')} error={errors.city} />
          <SectionLabel>{t('mk.photos')}</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {item?.images.map((img) => (
              <View key={img.id}>
                <Image source={remoteImage(img.url)} style={{ width: 84, height: 84, borderRadius: 12, backgroundColor: '#fff' }} contentFit="contain" />
                <Pressable accessibilityLabel={t('common.remove')} onPress={() => removeImage(img.id)} className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-alert">
                  <Text className="text-[12px] font-bold text-white">×</Text>
                </Pressable>
              </View>
            ))}
            {photos.map((uri) => (
              <View key={uri}>
                <Image source={uri} style={{ width: 84, height: 84, borderRadius: 12 }} contentFit="cover" />
                <Pressable accessibilityLabel={t('common.remove')} onPress={() => setPhotos(photos.filter((p) => p !== uri))} className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/60">
                  <Text className="text-[12px] font-bold text-white">×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1"><Button title={t('common.takePhoto')} size="sm" variant="secondary" icon={icons.camera} onPress={async () => { const u = await pickPhoto('camera'); if (u) setPhotos([...photos, u].slice(0, 8)); }} /></View>
            <View className="flex-1"><Button title={t('common.choosePhoto')} size="sm" variant="secondary" icon={icons.photo} onPress={async () => { const u = await pickPhoto('library'); if (u) setPhotos([...photos, u].slice(0, 8)); }} /></View>
          </View>
          <Text className="text-[12.5px] text-muted">{t('mk.photosHint')}</Text>
        </>
      )}
    </Screen>
  );
}
