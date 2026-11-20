import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { photoPart } from '@/api/client';
import { SelectField } from '@/components/SelectField';
import { Button, Card, ConfirmSheet, Field, icons, Loading, pickPhoto, Screen, Toggle } from '@/components/ui';
import { useT } from '@/i18n';
import { clearError, rules, useValidate } from '@/lib/validate';
import { notify } from '@/lib/toast';
import { useDraft } from '@/lib/useDraft';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { ApiFailure } from '@/types/api';

import type { StaffProduct } from '../products';

type Cats = { categories: { id: number; name: string }[] };
const blank = { name: '', category: '', new_category: '', summary: '', price: '', description: '', specs: '', sort: '0', quote_only: false, fitting_available: false, in_stock: true, active: true };

/** Add or edit a Shop product (all the website form's fields). */
export default function ProductEdit() {
  const t = useT();
  const check = useValidate();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const q = useResource<StaffProduct>(isNew ? null : `/office/products/${id}/`);
  const p = q.data;
  const cats = useResource<Cats>('/office/products/?show=all');
  const { run, busy } = useAction();
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useDraft(
    p
      ? { name: p.name, category: String(p.category.id), new_category: '', summary: p.summary, price: p.price ? String(Math.round(Number(p.price))) : '', description: p.description ?? '',
          specs: p.specs_text ?? '', sort: String(p.sort), quote_only: p.quote_only, fitting_available: p.fitting_available, in_stock: p.in_stock, active: p.active }
      : blank,
    p?.id ?? 'new',
  );
  const set = <K extends keyof typeof blank>(k: K) => (v: (typeof blank)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    clearError(setErrors, k);
  };

  async function save() {
    setErrors({});
    const found = check(form, { name: [rules.required], summary: [rules.required], price: form.quote_only ? [rules.amount] : [rules.required, rules.amount] });
    setErrors(found);
    if (Object.keys(found).length) return notify.error(t('v.fixFields'));
    const body = new FormData();
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === 'boolean') {
        if (v) body.append(k, 'on');
      } else body.append(k, v);
    }
    body.append('badge', p?.badge ?? '');
    if (photo) body.append('image', photoPart(photo, 'product.jpg'));
    try {
      await run(isNew ? '/office/products/' : `/office/products/${id}/`, { method: isNew ? 'POST' : 'PATCH', body, invalidate: ['/office/products/', '/shop/'], success: t('me.saved'), toastError: false });
      router.back();
    } catch (e) {
      setErrors(fieldErrors(e));
      notify.error(Object.keys(fieldErrors(e)).length ? t('v.fixFields') : (e as ApiFailure).message);
    }
  }

  if (!isNew && !p) return <Screen><Loading /></Screen>;
  return (
    <Screen footer={<Button title={t('common.save')} busy={busy} onPress={save} />}>
      <Stack.Screen options={{ title: isNew ? t('products.add') : t('products.edit') }} />
      <View className="flex-row items-center gap-3">
        <View className="h-20 w-20 overflow-hidden rounded-2xl bg-mist">
          {photo || p?.image_url ? <Image source={photo ?? p?.image_url} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
        </View>
        <Button title={t('products.photo')} variant="soft" size="sm" icon={icons.camera} onPress={async () => setPhoto((await pickPhoto('library', true)) ?? photo)} />
      </View>
      <Field label={t('products.name')} placeholder={t('ph.products.name')} value={form.name} onChangeText={set('name')} error={errors.name} />
      <SelectField label={t('products.category')} value={form.category} options={(cats.data?.categories ?? []).map((c) => ({ key: String(c.id), label: c.name }))} onChange={set('category')} error={errors.category} />
      <Field label={t('products.newCategory')} placeholder={t('ph.products.newCategory')} value={form.new_category} onChangeText={set('new_category')} error={errors.new_category} />
      <Field label={t('products.summary')} placeholder={t('ph.products.summary')} value={form.summary} onChangeText={set('summary')} error={errors.summary} />
      <Field label={t('products.price')} placeholder={t('ph.products.price')} value={form.price} onChangeText={set('price')} keyboardType="number-pad" hint={t('products.priceHint')} error={errors.price} />
      <Field label={t('products.description')} placeholder={t('ph.products.description')} value={form.description} onChangeText={set('description')} multiline />
      <Field label={t('products.specs')} placeholder={t('ph.products.specs')} value={form.specs} onChangeText={set('specs')} multiline hint={t('products.specsHint')} />
      <Field label={t('products.sort')} placeholder={t('ph.products.sort')} value={form.sort} onChangeText={set('sort')} keyboardType="number-pad" />
      <Card>
        <Toggle label={t('products.quoteOnly')} value={form.quote_only} onChange={set('quote_only')} />
        <Toggle label={t('products.fitting')} value={form.fitting_available} onChange={set('fitting_available')} />
        <Toggle label={t('products.inStock')} value={form.in_stock} onChange={set('in_stock')} />
        <Toggle label={t('products.inShop')} value={form.active} onChange={set('active')} />
      </Card>
      {!isNew ? <Button title={t('products.delete')} variant="ghost" icon={icons.trash} onPress={() => setDeleting(true)} /> : null}
      <ConfirmSheet open={deleting} onClose={() => setDeleting(false)} title={t('products.delete')} message={t('products.deleteSub')} confirm={t('products.delete')} busy={busy}
        onConfirm={async () => { try { await run(`/office/products/${id}/`, { method: 'DELETE', invalidate: ['/office/products/', '/shop/'] }); setDeleting(false); router.back(); } catch { /* toast */ } }} />
    </Screen>
  );
}
