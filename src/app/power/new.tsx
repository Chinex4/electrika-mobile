import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { photoPart } from '@/api/client';
import { SelectField } from '@/components/SelectField';
import { Button, Choices, ErrorText, Field, Loading, OptionCards, PhotoStrip, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { useConfig } from '@/lib/config';
import { fieldErrors, useAction, useAppSelector, useResource } from '@/store/hooks';
import { selectUser } from '@/store/selectors';
import type { ApiFailure, Choice, PowerReport } from '@/types/api';

type Choices_ = { kinds: (Choice & { hint: string })[]; durations: Choice[] };

export default function NewPowerReport() {
  const t = useT();
  const user = useAppSelector(selectUser);
  const config = useConfig();
  const q = useResource<Choices_>('/voice/', { auth: !!user });
  const { run, busy } = useAction();
  const [form, setForm] = useState({ kind: '', duration: 'WEEK', details: '', meter_number: '', area: '', address: '', name: user?.name ?? '', phone: user?.phone_number ?? '', email: user?.email ?? '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function send() {
    setErrors({});
    setError('');
    const body = new FormData();
    for (const [k, v] of Object.entries(form)) if (v) body.append(k, v);
    if (photos[0]) body.append('photo', photoPart(photos[0]));
    try {
      const r = await run<PowerReport>('/voice/', { body, auth: !!user, success: t('power.sent'), toastError: false, invalidate: ['/voice/', '/customer/'] });
      router.replace(`/power/${r.token}`);
    } catch (e) {
      setErrors(fieldErrors(e));
      setError((e as ApiFailure).message);
    }
  }

  if (!q.data) return <Screen><Loading /></Screen>;
  return (
    <Screen footer={<Button title={t('common.send')} busy={busy} onPress={send} size="lg" />}>
      <Stack.Screen options={{ title: '' }} />
      <Title sub={t('power.newSub')}>{t('power.new')}</Title>
      <OptionCards label={t('power.what')} options={q.data.kinds} value={form.kind} onChange={set('kind')} error={errors.kind} />
      <Choices label={t('power.howLong')} options={q.data.durations} value={form.duration} onChange={set('duration')} />
      <Field label={t('power.details')} placeholder={t('ph.power.details')} value={form.details} onChangeText={set('details')} multiline />
      <Field label={t('voice.meter')} placeholder={t('ph.voice.meter')} value={form.meter_number} onChangeText={set('meter_number')} autoCapitalize="characters" />
      <SelectField label={t('form.area')} value={form.area} onChange={set('area')} options={(config.data?.areas ?? []).map((a) => ({ key: a.key, label: a.label }))} />
      <Field label={t('power.street')} placeholder={t('ph.power.street')} value={form.address} onChangeText={set('address')} />
      <PhotoStrip label={t('power.photo')} photos={photos} onChange={setPhotos} max={1} />
      {!user ? (
        <>
          <Field label={t('auth.name')} placeholder={t('ph.auth.name')} value={form.name} onChangeText={set('name')} error={errors.name} />
          <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
          <Field label={t('auth.email')} placeholder={t('ph.auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        </>
      ) : null}
      <ErrorText>{Object.keys(errors).length ? '' : error}</ErrorText>
    </Screen>
  );
}
