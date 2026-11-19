import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { photoPart } from '@/api/client';
import { SelectField } from '@/components/SelectField';
import { Banner, Button, ErrorText, Field, OptionCards, PhotoStrip, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { useConfig } from '@/lib/config';
import { fieldErrors, useAction, useAppSelector, useResource } from '@/store/hooks';
import { selectUser } from '@/store/selectors';
import type { ApiFailure, Choice } from '@/types/api';

type FormChoices = { design: Choice[]; partner_kinds: Choice[] };

/** Design and build, or partnering with us (estates, developers, facility managers). */
export default function Enquire() {
  const t = useT();
  const { kind } = useLocalSearchParams<{ kind: 'design' | 'partner' }>();
  const partner = kind === 'partner';
  const user = useAppSelector(selectUser);
  const config = useConfig();
  const choices = useResource<FormChoices>('/enquiries/choices/', { auth: false });
  const { run, busy } = useAction();
  const [form, setForm] = useState({ project: '', about: '', address: '', area: '', kind: '', organisation: '', sites: '', notes: '', name: user?.name ?? '', phone: user?.phone_number ?? '', email: user?.email ?? '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function send() {
    setErrors({});
    setError('');
    let body: FormData | Record<string, string>;
    if (partner) body = { kind: form.kind, organisation: form.organisation, sites: form.sites, notes: form.notes, name: form.name, phone: form.phone, email: form.email };
    else {
      body = new FormData();
      for (const k of ['project', 'about', 'address', 'area', 'name', 'phone', 'email'] as const) if (form[k]) body.append(k, form[k]);
      if (photos[0]) body.append('drawing', photoPart(photos[0], 'drawing.jpg'));
    }
    try {
      await run(partner ? '/enquiries/partner/' : '/enquiries/design-build/', { body, auth: !!user, toastError: false });
      router.back();
    } catch (e) {
      setErrors(fieldErrors(e));
      setError((e as ApiFailure).message);
    }
  }

  return (
    <Screen footer={<Button title={t('common.send')} busy={busy} onPress={send} size="lg" />}>
      <Stack.Screen options={{ title: '' }} />
      <Title sub={partner ? t('enquire.partnerSub') : t('enquire.designSub')}>{partner ? t('account.partner') : t('account.designBuild')}</Title>
      {partner ? (
        <>
          <OptionCards label={t('enquire.youAre')} options={choices.data?.partner_kinds ?? []} value={form.kind} onChange={set('kind')} error={errors.kind} />
          <Field label={t('enquire.organisation')} placeholder={t('ph.enquire.organisation')} value={form.organisation} onChangeText={set('organisation')} error={errors.organisation} />
          <Field label={t('enquire.sites')} placeholder={t('ph.enquire.sites')} value={form.sites} onChangeText={set('sites')} keyboardType="number-pad" error={errors.sites} />
          <Field label={t('form.anythingElse')} placeholder={t('ph.form.anythingElse')} value={form.notes} onChangeText={set('notes')} multiline />
        </>
      ) : (
        <>
          <OptionCards label={t('enquire.planning')} options={choices.data?.design ?? []} value={form.project} onChange={set('project')} error={errors.project} />
          <Field label={t('enquire.about')} placeholder={t('ph.enquire.about')} value={form.about} onChangeText={set('about')} multiline error={errors.about} />
          <Field label={t('enquire.where')} placeholder={t('ph.enquire.where')} value={form.address} onChangeText={set('address')} />
          <SelectField label={t('form.area')} value={form.area} onChange={set('area')} options={(config.data?.areas ?? []).map((a) => ({ key: a.key, label: a.label }))} />
          <PhotoStrip label={t('enquire.drawing')} photos={photos} onChange={setPhotos} max={1} />
        </>
      )}
      <Field label={t('auth.name')} placeholder={t('ph.auth.name')} value={form.name} onChangeText={set('name')} error={errors.name} />
      <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
      <Field label={t('auth.email')} placeholder={t('ph.auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      <Banner tone="info">{partner ? t('enquire.partnerWhen') : t('enquire.designWhen')}</Banner>
      <ErrorText>{Object.keys(errors).length ? '' : error}</ErrorText>
    </Screen>
  );
}
