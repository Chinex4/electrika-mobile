import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Choices, ErrorText, Field, Loading, Screen, Small, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { ApiFailure, Choice, Site } from '@/types/api';

type Check = { items: { key: string; label: string; guide: string }[]; answers: Choice[]; sites: Site[] };

/** The monthly self-check: a few looks around, each "All fine", "Something's not right" or "Doesn't apply". */
export default function SelfCheck() {
  const t = useT();
  const q = useResource<Check>('/care/check/');
  const d = q.data;
  const { run, busy } = useAction();
  const [site, setSite] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [meter, setMeter] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function send() {
    setErrors({});
    setError('');
    const body: Record<string, string> = { meter_reading: meter, notes };
    if (site || d?.sites[0]) body.site = site || String(d!.sites[0].id);
    for (const [k, v] of Object.entries(answers)) body[`item_${k}`] = v;
    try {
      const res = await run<{ concerns: string[]; next: string | null; prefill: string }>('/care/check/', { body, success: false, toastError: false, invalidate: ['/care/'] });
      if (res.concerns.length) {
        notify.warning(t('care.checkConcern'));
        router.replace({ pathname: '/care/noticed', params: { prefill: res.prefill } });
      } else {
        notify.success(t('care.checkDone'));
        router.back();
      }
    } catch (e) {
      setErrors(fieldErrors(e));
      setError((e as ApiFailure).message);
    }
  }

  if (!d) return <Screen><Loading /></Screen>;
  return (
    <Screen footer={<Button title={t('care.saveCheck')} busy={busy} onPress={send} />}>
      <Stack.Screen options={{ title: '' }} />
      <Title sub={t('care.checkIntro')}>{t('care.check')}</Title>
      {d.sites.length > 1 ? <Choices label={t('care.whichSite')} options={d.sites.map((s) => ({ key: String(s.id), label: s.name }))} value={site || String(d.sites[0].id)} onChange={setSite} /> : null}
      {d.items.map((item, i) => (
        <Card key={item.key}>
          <View className="flex-row gap-2">
            <Text className="text-[15px] font-bold text-brand">{i + 1}.</Text>
            <Text className="flex-1 text-[15px] font-semibold text-navy">{item.label}</Text>
          </View>
          {item.guide ? <Small>{item.guide}</Small> : null}
          <Choices options={d.answers} value={answers[item.key]} onChange={(k) => setAnswers((a) => ({ ...a, [item.key]: k }))} tone={answers[item.key] === 'CONCERN' ? 'alert' : 'brand'}
            error={errors[`item_${item.key}`]} />
        </Card>
      ))}
      <Field label={t('care.meterLabel')} placeholder={t('ph.care.meterLabel')} value={meter} onChangeText={setMeter} keyboardType="decimal-pad" error={errors.meter_reading} />
      <Field label={t('form.anythingElse')} placeholder={t('ph.form.anythingElse')} value={notes} onChangeText={setNotes} multiline />
      <ErrorText>{Object.keys(errors).length ? t('form.checkFields') : error}</ErrorText>
    </Screen>
  );
}
