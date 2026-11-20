import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import { SelectField } from '@/components/SelectField';
import { Banner, Button, Choices, Field, Loading, OptionCards, Screen } from '@/components/ui';
import { useT } from '@/i18n';
import { clearError, rules, useValidate } from '@/lib/validate';
import { notify } from '@/lib/toast';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { ApiFailure, Choice, Job, Site } from '@/types/api';

type NewJob = { sites: (Site & { client: string })[]; job_types: Choice[]; review_modes: Choice[]; can_assign: boolean; technicians: { id: number; name: string; cluster_label: string; available: boolean }[] };

/** Log a job against a client's site, as Dispatch or an Account Manager does on the website. */
export default function NewJobScreen() {
  const t = useT();
  const check = useValidate();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);
  const q = useResource<NewJob>(`/dispatch/new-job/${term ? `?q=${encodeURIComponent(term)}` : ''}`);
  const d = q.data;
  const { run, busy } = useAction();
  const [form, setForm] = useState({ site: '', job_type: '', description: '', scheduled_for: '', report_review: '', technician: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    clearError(setErrors, k);
  };

  async function save() {
    setErrors({});
    const found = check(form, { site: [rules.required], job_type: [rules.required], description: [rules.required] });
    setErrors(found);
    if (Object.keys(found).length) return notify.error(t('v.fixFields'));
    try {
      const res = await run<{ job: Job }>('/dispatch/new-job/', { body: form, invalidate: ['/dispatch/', '/office/'], toastError: false });
      router.replace(`/job/${res.job.id}`);
    } catch (e) {
      setErrors(fieldErrors(e));
      notify.error(Object.keys(fieldErrors(e)).length ? t('v.fixFields') : (e as ApiFailure).message);
    }
  }

  return (
    <Screen footer={<Button title={t('newJob.log')} busy={busy} onPress={save} size="lg" />}>
      <Stack.Screen options={{ title: t('board.newJob') }} />
      {!d ? <Loading /> : null}
      {d ? (
        <>
          <Field label={t('newJob.findSite')} value={search} onChangeText={setSearch} placeholder={t('newJob.findHint')} />
          <SelectField label={t('newJob.site')} value={form.site} onChange={set('site')} options={d.sites.map((s) => ({ key: String(s.id), label: `${s.client} · ${s.name}`, sub: s.address_line || s.address }))} error={errors.site} />
          <OptionCards label={t('newJob.type')} options={d.job_types} value={form.job_type} onChange={set('job_type')} error={errors.job_type} />
          <Field label={t('newJob.description')} placeholder={t('ph.newJob.description')} value={form.description} onChangeText={set('description')} multiline error={errors.description} />
          <Field label={t('newJob.when')} value={form.scheduled_for} onChangeText={set('scheduled_for')} placeholder="2026-11-20T10:00" hint={t('newJob.whenHint')} error={errors.scheduled_for} autoCapitalize="none" />
          <Choices label={t('job.reviewWhen')} options={d.review_modes.filter((m) => m.key)} value={form.report_review} onChange={set('report_review')} />
          {d.can_assign ? (
            <SelectField label={t('newJob.engineer')} value={form.technician} onChange={set('technician')} placeholder={t('newJob.later')}
              options={[{ key: '', label: t('newJob.later') }, ...d.technicians.map((x) => ({ key: String(x.id), label: x.name, sub: [x.cluster_label, x.available ? t('newJob.free') : t('newJob.busy')].join(' · ') }))]} />
          ) : (
            <Banner tone="info">{t('newJob.amNote')}</Banner>
          )}
        </>
      ) : null}
    </Screen>
  );
}
