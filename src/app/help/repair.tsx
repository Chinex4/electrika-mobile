import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { photoPart } from '@/api/client';
import { SelectField } from '@/components/SelectField';
import { Banner, Button, Card, Choices, Field, Heading, KeyValue, OptionCards, PhotoStrip, Progress, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { clearError, rules, useValidate } from '@/lib/validate';
import { useConfig } from '@/lib/config';
import { naira } from '@/lib/format';
import { notify } from '@/lib/toast';
import { fieldErrors, useAction, useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/selectors';
import type { ApiFailure, CodeCheck, HelpRequest } from '@/types/api';

/** Book a repair in three steps, as on the website: what and when, where and who, then check and send. */
export default function Repair() {
  const t = useT();
  const check = useValidate();
  const user = useAppSelector(selectUser);
  const config = useConfig();
  const c = config.data;
  const { run, busy } = useAction();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ job: '', day: 'TOMORROW', date: '', slot: 'ANY', details: '', address: '', area: '', landmark: '', name: user?.name ?? '', phone: user?.phone_number ?? '', email: user?.email ?? '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    clearError(setErrors, k);
  };
  const label = (list: { key: string; label: string }[] | undefined, key: string) => list?.find((x) => x.key === key)?.label ?? '';

  function next() {
    if (step === 0 && !form.job) return setErrors({ job: t('repair.chooseJob') });
    if (step === 0 && form.day === 'PICK' && !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return setErrors({ date: t('repair.dateFormat') });
    if (step === 1) {
      const found = check(form, {
        details: [rules.required],
        address: [rules.required],
        area: [rules.required],
        ...(user ? {} : { name: [rules.required], phone: [rules.required, rules.phone], email: [rules.email] }),
      });
      if (!form.details.trim()) delete found.details;
      if (Object.keys(found).length || !form.details.trim()) return setErrors({ ...found, ...(form.details.trim() ? {} : { details: t('repair.needDetails') }) });
    }
    setErrors({});
    setStep((s) => s + 1);
  }

  async function send() {
    const body = new FormData();
    for (const [k, v] of Object.entries(form)) if (v) body.append(k, v);
    if (photos[0]) body.append('photo', photoPart(photos[0]));
    try {
      const res = await run<{ request?: HelpRequest; check?: CodeCheck }>('/requests/repair/', { body, auth: !!user, success: false, toastError: false, invalidate: ['/customer/'] });
      if (res.check) return router.replace({ pathname: '/help/confirm', params: { check: res.check.check, to: res.check.sent_to } });
      notify.success(t('repair.booked'));
      router.replace(`/request/${res.request!.token}`);
    } catch (e) {
      const f = fieldErrors(e);
      setErrors(f);
      notify.error(Object.keys(f).length ? t('v.fixFields') : (e as ApiFailure).message);
      if (f.job || f.day || f.date || f.slot) setStep(0);
      else if (Object.keys(f).length) setStep(1);
    }
  }

  return (
    <Screen
      footer={
        <View className="flex-row gap-2">
          {step > 0 ? <Button title={t('common.back')} variant="secondary" onPress={() => setStep((s) => s - 1)} /> : null}
          {step < 2 ? <Button className="flex-1" title={t('common.continue')} onPress={next} /> : <Button className="flex-1" title={t('repair.send')} busy={busy} onPress={send} />}
        </View>
      }>
      <Stack.Screen options={{ title: t('home.repair') }} />
      <Progress steps={[t('repair.step1'), t('repair.step2'), t('repair.step3')]} current={step} />
      {step === 0 && c ? (
        <>
          <OptionCards label={t('repair.what')} options={c.repair_jobs} value={form.job} onChange={set('job')} error={errors.job} />
          <Choices label={t('repair.when')} options={c.repair_days} value={form.day} onChange={set('day')} />
          {form.day === 'PICK' ? <Field label={t('repair.date')} value={form.date} onChangeText={set('date')} placeholder="2026-11-24" error={errors.date} /> : null}
          <Choices label={t('repair.slot')} options={c.repair_slots} value={form.slot} onChange={set('slot')} />
          <PhotoStrip label={t('repair.photo')} photos={photos} onChange={setPhotos} max={1} />
          {c.visit_fee ? <Banner tone="info">{t('repair.fee', { fee: naira(c.visit_fee) })}</Banner> : null}
        </>
      ) : null}
      {step === 1 ? (
        <>
          <Field label={t('repair.details')} placeholder={t('ph.repair.details')} value={form.details} onChangeText={set('details')} multiline error={errors.details} hint={t('repair.detailsHint')} />
          <Field label={t('form.address')} placeholder={t('ph.form.address')} value={form.address} onChangeText={set('address')} autoComplete="street-address" error={errors.address} />
          <SelectField label={t('form.area')} value={form.area} onChange={set('area')} options={(c?.areas ?? []).map((a) => ({ key: a.key, label: a.label }))} error={errors.area} />
          <Field label={t('form.landmark')} value={form.landmark} onChangeText={set('landmark')} placeholder={t('form.landmarkHint')} />
          {!user ? (
            <>
              <Field label={t('auth.name')} placeholder={t('ph.auth.name')} value={form.name} onChangeText={set('name')} autoComplete="name" error={errors.name} />
              <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
              <Field label={t('auth.email')} placeholder={t('ph.auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
            </>
          ) : null}
        </>
      ) : null}
      {step === 2 ? (
        <Card>
          <Heading>{t('repair.check')}</Heading>
          <KeyValue label={t('repair.what')} value={label(c?.repair_jobs, form.job)} />
          <KeyValue label={t('repair.when')} value={[label(c?.repair_days, form.day), form.day === 'PICK' ? form.date : '', label(c?.repair_slots, form.slot)].filter(Boolean).join(' · ')} />
          <KeyValue label={t('form.address')} value={[form.address, label(c?.areas, form.area), form.landmark].filter(Boolean).join(', ')} />
          <KeyValue label={t('auth.name')} value={form.name} />
          <KeyValue label={t('auth.phone')} value={form.phone} />
          <Small>{form.details}</Small>
        </Card>
      ) : null}
    </Screen>
  );
}
