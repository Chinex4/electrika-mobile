import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import { StaySafe } from '@/components/StaySafe';
import { Banner, brandColors, Button, Card, Choices, cx, ErrorText, Field, Heading, Icon, icons, Screen, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { FALLBACK_SUPPORT_PHONE, useConfig } from '@/lib/config';
import { locateMe } from '@/lib/locate';
import { call } from '@/lib/pay';
import { fieldErrors, useAction, useAppSelector, useResource } from '@/store/hooks';
import { selectUser } from '@/store/selectors';
import type { ApiFailure, CodeCheck, HelpRequest, Job, Site } from '@/types/api';

type PlanSites = { on_plan: boolean; response_hours?: number; sites: Site[] };
type Reply = { request?: HelpRequest; check?: CodeCheck; plan_job?: Job; response_hours?: number };

/**
 * Emergency help. A plan member raises it on their plan (the response clock
 * starts); anyone else sends the website's request, with "Find my location"
 * filling in the address from the phone's GPS. Guests confirm a code first.
 */
export default function Emergency() {
  const t = useT();
  const user = useAppSelector(selectUser);
  const config = useConfig();
  const plan = useResource<PlanSites>(user?.role === 'CLIENT' ? '/requests/plan-sites/' : null);
  const { run, busy } = useAction();
  const [problem, setProblem] = useState('');
  const [site, setSite] = useState<number | null>(null);
  const [form, setForm] = useState({ address: '', area: '', landmark: '', details: '', name: '', phone: '' });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [done, setDone] = useState<Reply | null>(null);
  const onPlan = !!plan.data?.on_plan;
  const support = config.data?.support_phone ?? FALLBACK_SUPPORT_PHONE;
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const problemLabel = config.data?.emergency_problems.find((p) => p.key === problem)?.label ?? '';

  async function locate() {
    setLocating(true);
    setError('');
    try {
      const here = await locateMe(t('help.locationOff'));
      setCoords({ lat: here.lat, lng: here.lng });
      if (here.address) set('address')(here.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLocating(false);
    }
  }

  async function send() {
    setError('');
    setErrors({});
    try {
      const body = onPlan
        ? { site: site ?? plan.data?.sites[0]?.id, description: [problemLabel, form.details].filter(Boolean).join('. ') }
        : { problem, ...form, ...(user ? { name: undefined, phone: undefined } : {}), ...(coords ?? {}) };
      const res = await run<Reply>('/requests/emergency/', { body, auth: !!user, success: false, toastError: false, invalidate: ['/customer/', '/requests/'] });
      if (res.check) {
        router.push({ pathname: '/help/confirm', params: { check: res.check.check, to: res.check.sent_to } });
        return;
      }
      setDone(res);
    } catch (e) {
      setErrors(fieldErrors(e));
      setError((e as ApiFailure).message);
    }
  }

  if (done) {
    const steps = done.request?.stay_safe ?? [];
    return (
      <Screen footer={<Button title={t('help.callUs', { phone: support })} variant="secondary" icon={icons.phone} onPress={() => call(support)} />}>
        <Stack.Screen options={{ title: t('help.coming') }} />
        <Card tone="alert">
          <Text className="text-[24px] font-bold text-alert-ink">{t('help.onIt')}</Text>
          {done.plan_job ? <Text className="text-[15px] text-ink">{t('help.planJob', { h: done.response_hours ?? '' })}</Text> : null}
          {done.request ? <Text className="text-[15px] text-ink">{t('help.reference', { ref: done.request.reference })}</Text> : null}
        </Card>
        {done.request ? <Button title={t('help.follow')} onPress={() => router.replace(`/request/${done.request!.token}`)} /> : null}
        {done.plan_job ? <Button title={t('help.follow')} onPress={() => router.replace('/customer/activity')} /> : null}
        {steps.length ? <Heading>{t('help.staySafe')}</Heading> : null}
        <StaySafe steps={steps} />
        <Button title={t('help.call112')} variant="danger" onPress={() => call('112')} />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title={t('help.send')} variant="danger" size="lg" busy={busy} icon={icons.bolt} onPress={send} />}>
      <Stack.Screen options={{ title: t('help.emergency') }} />
      <View className="gap-1">
        <Text className="text-[28px] font-bold text-navy">{t('help.whatsHappening')}</Text>
        <Small>{onPlan ? t('help.planPromise', { h: plan.data?.response_hours ?? '' }) : t('help.fast')}</Small>
      </View>
      <Pressable onPress={() => call('112')}>
        <Banner tone="alert" title={t('help.fire')}>{t('help.fireSub')}</Banner>
      </Pressable>
      <Choices options={config.data?.emergency_problems ?? []} value={problem} onChange={setProblem} tone="alert" error={errors.problem} />

      {onPlan ? (
        <Card>
          <Heading>{t('help.where')}</Heading>
          {(plan.data?.sites ?? []).map((s) => {
            const on = (site ?? plan.data?.sites[0]?.id) === s.id;
            return (
              <Pressable key={s.id} onPress={() => setSite(s.id)} className={cx('flex-row items-center gap-3 rounded-2xl border-[1.5px] p-3.5', on ? 'border-brand bg-haze' : 'border-line bg-white')}>
                <Icon name={icons.pin} size={18} color={on ? brandColors.brand : brandColors.muted} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-navy">{s.name}</Text>
                  <Small>{s.address_line}</Small>
                </View>
              </Pressable>
            );
          })}
        </Card>
      ) : (
        <Card>
          <Button title={locating ? t('help.finding') : coords ? t('help.found') : t('help.findMe')} variant={coords ? 'success' : 'soft'} busy={locating} icon={icons.location} onPress={locate} />
          <Field label={t('form.address')} value={form.address} onChangeText={set('address')} placeholder={t('help.addressHint')} autoComplete="street-address" error={errors.address} />
          <SelectField label={t('form.area')} value={form.area} onChange={set('area')} options={(config.data?.areas ?? []).map((a) => ({ key: a.key, label: a.label }))} error={errors.area} />
          <Field label={t('form.landmark')} value={form.landmark} onChangeText={set('landmark')} placeholder={t('form.landmarkHint')} />
          {!user ? (
            <>
              <Field label={t('auth.name')} placeholder={t('ph.auth.name')} value={form.name} onChangeText={set('name')} autoComplete="name" error={errors.name} />
              <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
            </>
          ) : null}
        </Card>
      )}
      <Field label={t('form.anythingElse')} placeholder={t('ph.form.anythingElse')} value={form.details} onChangeText={set('details')} multiline error={errors.details ?? errors.description} />
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
