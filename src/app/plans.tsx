import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import { Banner, Between, brandColors, Button, Card, Check, Choices, ErrorText, Failed, Field, Icon, icons, Loading, Pill, Screen, Sheet, Small, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { useConfig } from '@/lib/config';
import { naira } from '@/lib/format';
import { fieldErrors, useAction, useAppSelector, useResource } from '@/store/hooks';
import { selectUser } from '@/store/selectors';
import type { ApiFailure, Choice } from '@/types/api';

type Plan = { tier: string; label: string; fits: string; sla_hours: number; visits_per_year: number; base_fee: string };
type Plans = { results: Plan[]; credits_on: boolean; warranty_days: number | null };
type FormChoices = { plans: Choice[]; who: Choice[] };

/** The Care plans, and booking the free site assessment that starts one. */
export default function PlansScreen() {
  const t = useT();
  const q = useResource<Plans>('/plans/', { auth: false });
  const [booking, setBooking] = useState<string | null>(null);
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch} footer={<Button title={t('plans.book')} icon={icons.calendar} onPress={() => setBooking('UNSURE')} />}>
      <Stack.Screen options={{ title: '' }} />
      <Title sub={t('plans.sub')}>{t('plans.title')}</Title>
      {q.isLoading ? <Loading rows={3} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data?.results.map((p, i) => (
        <Card key={p.tier} tone={i === 1 ? 'brand' : undefined}>
          <Between>
            <Text className="text-[22px] font-bold text-navy">{p.label}</Text>
            {i === 1 ? <Pill label={t('plans.popular')} tone="brand" /> : null}
          </Between>
          <Small>{p.fits}</Small>
          <Text className="text-[26px] font-extrabold text-brand">
            {naira(p.base_fee)}
            <Text className="text-sm font-medium text-muted"> {t('plans.perYear')}</Text>
          </Text>
          {[t('plans.response', { h: p.sla_hours }), t('plans.visits', { n: p.visits_per_year }), q.data?.credits_on ? t('plans.credits') : '', q.data?.warranty_days ? t('plans.warranty', { n: q.data.warranty_days }) : '']
            .filter(Boolean)
            .map((line) => (
              <View key={line} className="flex-row items-center gap-2">
                <Icon name={icons.check} size={16} color={brandColors.leaf} />
                <Text className="flex-1 text-[15px] text-ink">{line}</Text>
              </View>
            ))}
          <Button title={t('plans.choose', { plan: p.label })} variant={i === 1 ? 'primary' : 'secondary'} size="sm" onPress={() => setBooking(p.tier)} />
        </Card>
      ))}
      <Banner tone="info">{t('plans.how')}</Banner>
      <PlanRequest plan={booking} onClose={() => setBooking(null)} />
    </Screen>
  );
}

function PlanRequest({ plan, onClose }: { plan: string | null; onClose: () => void }) {
  const t = useT();
  const user = useAppSelector(selectUser);
  const config = useConfig();
  const choices = useResource<FormChoices>(plan ? '/enquiries/choices/' : null, { auth: false });
  const { run, busy } = useAction();
  const [form, setForm] = useState({ who: 'HOME', name: user?.name ?? '', contact_name: '', phone: user?.phone_number ?? '', email: user?.email ?? '', address: '', area: '', covered: '' });
  const [chosen, setChosen] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function send() {
    setErrors({});
    setError('');
    try {
      await run('/plans/request/', { body: { ...form, plan: chosen ?? plan, consent: consent ? 'on' : '' }, auth: !!user, toastError: false });
      onClose();
    } catch (e) {
      setErrors(fieldErrors(e));
      setError((e as ApiFailure).message);
    }
  }

  return (
    <Sheet open={!!plan} onClose={onClose} title={t('plans.book')} sub={t('plans.bookSub')} footer={<Button title={t('common.send')} busy={busy} onPress={send} />}>
      {choices.data ? <Choices label={t('plans.which')} options={choices.data.plans} value={chosen ?? plan} onChange={setChosen} /> : null}
      {choices.data ? <Choices label={t('plans.who')} options={choices.data.who} value={form.who} onChange={set('who')} /> : null}
      <Field label={t('plans.name')} placeholder={t('ph.plans.name')} value={form.name} onChangeText={set('name')} error={errors.name} />
      <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
      <Field label={t('auth.email')} placeholder={t('ph.auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      <Field label={t('plans.address')} placeholder={t('ph.plans.address')} value={form.address} onChangeText={set('address')} error={errors.address} />
      <SelectField label={t('form.area')} value={form.area} onChange={set('area')} options={(config.data?.areas ?? []).map((a) => ({ key: a.key, label: a.label }))} />
      <Field label={t('plans.covered')} placeholder={t('ph.plans.covered')} value={form.covered} onChangeText={set('covered')} multiline error={errors.covered} />
      <Check label={t('plans.consent')} value={consent} onChange={setConsent} />
      {errors.consent ? <ErrorText>{errors.consent}</ErrorText> : null}
      <ErrorText>{Object.keys(errors).length ? '' : error}</ErrorText>
    </Sheet>
  );
}
