import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { photoPart } from '@/api/client';
import { SelectField } from '@/components/SelectField';
import { Banner, brandColors, Button, Card, Check, Choices, ErrorText, Field, Icon, icons, Loading, PhotoStrip, Screen, SectionLabel, Small, Stepper } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { ApiFailure } from '@/types/api';

import type { JobDetail } from './index';

type Finding = { text: string; status: string };

/**
 * The job report, as on the website: what was found and done (up to five
 * findings, each Fixed / OK / Watch), parts used, photos, notes and
 * "fixed first time". It goes to Dispatch and the Program Manager for
 * sign-off before the client sees it.
 */
export default function ReportScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useResource<JobDetail>(`/job/${id}/`);
  const j = q.data;
  const { run, busy } = useAction();
  const [findings, setFindings] = useState<Finding[]>([{ text: '', status: 'FIXED' }]);
  const [parts, setParts] = useState<{ id: number; qty: number }[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState(j?.sent_back?.technician_notes ?? '');
  const [firstTime, setFirstTime] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFinding = (i: number, patch: Partial<Finding>) => setFindings((f) => f.map((x, n) => (n === i ? { ...x, ...patch } : x)));

  async function send() {
    setErrors({});
    const filled = findings.filter((f) => f.text.trim());
    if (!filled.length && !notes.trim()) {
      setErrors({ technician_notes: t('report.needSomething') });
      return notify.error(t('report.needSomething'));
    }
    const form = new FormData();
    form.append('technician_notes', notes);
    form.append('first_time_fix', firstTime ? 'true' : 'false');
    form.append('findings', JSON.stringify(filled));
    form.append('parts', JSON.stringify(parts.filter((p) => p.qty > 0)));
    photos.forEach((uri, i) => form.append('photos', photoPart(uri, `photo-${i + 1}.jpg`)));
    try {
      const res = await run<{ waiting_on_site: boolean; detail: string }>(`/job/${id}/report/`, {
        body: form,
        success: false,
        toastError: false,
        invalidate: ['/job/', '/tech/', '/dispatch/'],
      });
      if (res.waiting_on_site) notify.warning(res.detail);
      else notify.success(res.detail);
      router.back();
    } catch (e) {
      setErrors(fieldErrors(e));
      notify.error((e as ApiFailure).message);
    }
  }

  if (!j) return <Screen>{q.error ? <ErrorText>{q.error.message}</ErrorText> : <Loading />}</Screen>;
  const partOptions = j.parts.filter((p) => !parts.some((x) => x.id === p.id)).map((p) => ({ key: p.id, label: p.name, sub: t('report.inStock', { n: p.in_stock }) }));

  return (
    <Screen footer={<Button title={t('report.send')} icon={icons.send} busy={busy} onPress={send} size="lg" />}>
      <Stack.Screen options={{ title: t('job.report') }} />
      <Small>{j.site?.name}</Small>
      {j.sent_back ? <Banner tone="amber" title={t('report.fixThis')}>{j.sent_back.note}</Banner> : null}
      {j.review_mode === 'ON_SITE' ? <Banner tone="info">{t('report.stayOnSite')}</Banner> : null}

      <SectionLabel>{t('report.findings')}</SectionLabel>
      {findings.map((f, i) => (
        <Card key={i}>
          <Field label={t('report.findingN', { n: i + 1 })} value={f.text} onChangeText={(v) => setFinding(i, { text: v })} placeholder={t('report.findingHint')} />
          <Choices options={j.findings} value={f.status} onChange={(k) => setFinding(i, { status: k })} />
          {findings.length > 1 ? (
            <Pressable onPress={() => setFindings((x) => x.filter((_, n) => n !== i))} className="self-start">
              <Text className="text-sm font-semibold text-alert-ink">{t('common.remove')}</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
      {findings.length < 5 ? <Button title={t('report.addFinding')} variant="soft" size="sm" icon={icons.plus} onPress={() => setFindings((f) => [...f, { text: '', status: 'FIXED' }])} /> : null}

      <SectionLabel>{t('report.parts')}</SectionLabel>
      <Card>
        {parts.map((p) => {
          const part = j.parts.find((x) => x.id === p.id);
          return (
            <View key={p.id} className="flex-row items-center gap-3">
              <Text className="flex-1 text-[15px] text-navy">{part?.name}</Text>
              <Stepper value={p.qty} min={0} onChange={(qty) => setParts((x) => (qty ? x.map((y) => (y.id === p.id ? { ...y, qty } : y)) : x.filter((y) => y.id !== p.id)))} />
            </View>
          );
        })}
        {partOptions.length ? <SelectField label={t('report.addPart')} value={null} options={partOptions} onChange={(pid) => setParts((x) => [...x, { id: pid, qty: 1 }])} placeholder={t('report.choosePart')} /> : null}
        {!j.parts.length ? <Small>{t('report.noParts')}</Small> : null}
      </Card>

      <SectionLabel>{t('report.photosLabel')}</SectionLabel>
      <PhotoStrip photos={photos} onChange={setPhotos} max={8} />
      <Small>{t('report.photosHint')}</Small>

      <Field label={t('report.notes')} placeholder={t('ph.report.notes')} value={notes} onChangeText={setNotes} multiline hint={t('report.notesHint')} error={errors.technician_notes} />
      <Card>
        <Check label={t('report.firstTime')} value={firstTime} onChange={setFirstTime} />
      </Card>
      <View className="flex-row items-center gap-2 px-1">
        <Icon name={icons.info} size={14} color={brandColors.faint} />
        <Small className="flex-1">{t('report.reviewNote')}</Small>
      </View>
    </Screen>
  );
}
