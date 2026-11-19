import { useState } from 'react';

import { SelectField } from '@/components/SelectField';
import { Banner, Button, Choices, Field, Sheet } from '@/components/ui';
import { useT } from '@/i18n';
import { useConfig } from '@/lib/config';
import { fieldErrors, useAction, useAppSelector, useResource } from '@/store/hooks';
import { selectUser } from '@/store/selectors';
import type { Product } from '@/types/api';

/** Ask for a quote (sized items like solar) or today's price. */
export function QuoteSheet({ product, open, onClose }: { product: Product; open: boolean; onClose: () => void }) {
  const t = useT();
  const user = useAppSelector(selectUser);
  const config = useConfig();
  const loads = useResource<{ loads: { key: string; label: string }[] }>(product.quote_only && open ? '/shop/quote-loads/' : null, { auth: false });
  const { run, busy } = useAction();
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone_number ?? '', email: user?.email ?? '', address: '', area: '', notes: '' });
  const [chosen, setChosen] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function send() {
    setErrors({});
    try {
      await run(`/shop/${product.slug}/quote/`, { body: { ...form, loads: chosen }, auth: !!user, toastError: false });
      onClose();
    } catch (e) {
      setErrors(fieldErrors(e));
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={product.quote_only ? t('shop.askQuote') : t('shop.askPrice')} sub={product.name}
      footer={<Button title={t('common.send')} icon={{ sf: 'paperplane.fill', md: 'send' }} busy={busy} onPress={send} />}>
      {product.quote_only && loads.data ? (
        <Choices
          label={t('shop.keepRunning')}
          options={loads.data.loads}
          value={chosen}
          onChange={(k) => setChosen((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))}
        />
      ) : null}
      {!user ? (
        <>
          <Field label={t('auth.name')} placeholder={t('ph.auth.name')} value={form.name} onChangeText={set('name')} autoComplete="name" error={errors.name} />
          <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
          <Field label={t('auth.email')} placeholder={t('ph.auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        </>
      ) : null}
      <Field label={t('form.address')} placeholder={t('ph.form.address')} value={form.address} onChangeText={set('address')} autoComplete="street-address" error={errors.address} />
      <SelectField label={t('form.area')} value={form.area} onChange={set('area')} options={(config.data?.areas ?? []).map((a) => ({ key: a.key, label: a.label }))} error={errors.area} />
      <Field label={t('form.anythingElse')} placeholder={t('ph.form.anythingElse')} value={form.notes} onChangeText={set('notes')} multiline />
      <Banner tone="info">{t('shop.weCall')}</Banner>
    </Sheet>
  );
}
