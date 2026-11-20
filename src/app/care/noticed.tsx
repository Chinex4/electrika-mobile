import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { photoPart } from '@/api/client';
import { Banner, Button, Choices, Field, Loading, OptionCards, PhotoStrip, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { rules, useValidate } from '@/lib/validate';
import { notify } from '@/lib/toast';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { ApiFailure, Site } from '@/types/api';

type Noticed = { signs: { key: string; label: string; urgent: boolean }[]; sites: Site[] };

/** "I noticed something": the warning signs, how urgent, a photo. Urgent ones go straight to Dispatch. */
export default function NoticedScreen() {
  const t = useT();
  const check = useValidate();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const q = useResource<Noticed>('/care/noticed/');
  const d = q.data;
  const { run, busy } = useAction();
  const [site, setSite] = useState('');
  const [signs, setSigns] = useState<string[]>([]);
  const [urgent, setUrgent] = useState<'yes' | 'no' | null>(null);
  const [description, setDescription] = useState(prefill ?? '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const anyUrgent = !!d?.signs.some((s) => s.urgent && signs.includes(s.key));

  async function send() {
    setErrors({});
    const found = check({ description }, { description: [rules.required, rules.minLength(10)] });
    setErrors(found);
    if (Object.keys(found).length) return notify.error(t('v.fixFields'));
    const body = new FormData();
    if (site || d?.sites[0]) body.append('site', site || String(d!.sites[0].id));
    signs.forEach((s) => body.append('signs', s));
    body.append('urgent', urgent ?? (anyUrgent ? 'yes' : 'no'));
    body.append('description', description);
    if (photos[0]) body.append('photo', photoPart(photos[0]));
    try {
      const res = await run<{ urgent: boolean; job_id: number | null }>('/care/noticed/', { body, success: false, toastError: false, invalidate: ['/care/', '/customer/'] });
      notify.success(res.urgent ? t('care.noticedUrgent') : t('care.noticedThanks'));
      router.back();
    } catch (e) {
      setErrors(fieldErrors(e));
      notify.error(Object.keys(fieldErrors(e)).length ? t('v.fixFields') : (e as ApiFailure).message);
    }
  }

  if (!d) return <Screen><Loading /></Screen>;
  return (
    <Screen footer={<Button title={t('common.send')} variant={anyUrgent || urgent === 'yes' ? 'danger' : 'primary'} busy={busy} onPress={send} />}>
      <Stack.Screen options={{ title: '' }} />
      <Title sub={t('care.noticedIntro')}>{t('care.noticed')}</Title>
      {d.sites.length > 1 ? <Choices label={t('care.whichSite')} options={d.sites.map((s) => ({ key: String(s.id), label: s.name }))} value={site || String(d.sites[0].id)} onChange={setSite} /> : null}
      <Choices label={t('care.whatSigns')} options={d.signs} value={signs} onChange={(k) => setSigns((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))} error={errors.signs} />
      {anyUrgent ? <Banner tone="alert" title={t('care.urgentTitle')}>{t('care.urgentSub')}</Banner> : null}
      <OptionCards label={t('care.howUrgent')} value={urgent ?? (anyUrgent ? 'yes' : null)} onChange={setUrgent}
        options={[{ key: 'yes', label: t('care.urgentYes'), hint: t('care.urgentYesSub') }, { key: 'no', label: t('care.urgentNo'), hint: t('care.urgentNoSub') }]} error={errors.urgent} />
      <Field label={t('care.describe')} placeholder={t('ph.care.describe')} value={description} onChangeText={setDescription} multiline error={errors.description} />
      <PhotoStrip label={t('care.photo')} photos={photos} onChange={setPhotos} max={1} />
    </Screen>
  );
}
