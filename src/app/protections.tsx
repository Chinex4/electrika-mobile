import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import { Banner, Between, Button, Card, Failed, Field, Heading, Icon, icons, Loading, OptionCards, Pill, Screen, SectionLabel, Sheet, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { day, naira } from '@/lib/format';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { Choice, Person } from '@/types/api';
import { useColors } from '@/theme';

type Concern = { id: number; category_label: string; description: string; status: string; status_label: string; owner: Person | null; reply_due: string; latest_update: string; resolution: string; site: string };
type Protections = {
  policy: { credits_enabled: boolean; minor_percent: number; major_percent: number; cap_percent: number; exit_breaches: number; exit_window_days: number; warranty_days: number; reply_days: number };
  plan: { tier_label: string; response_hours: number; half_window_hours: number; example_minor: string; example_major: string } | null;
  open_concerns: Concern[];
  account_manager: Person | null;
  exit_right: boolean;
  pending_credits: { amount: string; percent: number; job_id: number }[];
};
type Concerns = { categories: Choice[]; reply_days: number; jobs: { id: number; label: string }[]; results: Concern[] };

/** The promises on the plan, written plainly, and raising a concern. */
export default function ProtectionsScreen() {
  const colors = useColors();
  const t = useT();
  const q = useResource<Protections>('/protections/');
  const concerns = useResource<Concerns>('/protections/concerns/');
  const [raising, setRaising] = useState(false);
  const d = q.data;
  const p = d?.policy;
  const promise = (title: string, text: string) => (
    <Card key={title}>
      <View className="flex-row items-start gap-3">
        <Icon name={icons.shield} size={18} color={colors.brand} />
        <View className="flex-1 gap-1">
          <Heading className="text-[16px]">{title}</Heading>
          <Text className="text-sm leading-5 text-ink">{text}</Text>
        </View>
      </View>
    </Card>
  );
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch} footer={<Button title={t('prot.raise')} variant="secondary" icon={icons.edit} onPress={() => setRaising(true)} />}>
      <Stack.Screen options={{ title: t('account.protections') }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d && p ? (
        <>
          {d.pending_credits.length ? <Banner tone="leaf" title={t('prot.creditsTitle')}>{d.pending_credits.map((c) => naira(c.amount)).join(' · ')}</Banner> : null}
          {d.plan && p.credits_enabled ? promise(t('prot.lateTitle'), t('prot.late', { h: d.plan.response_hours, minor: p.minor_percent, major: p.major_percent, a: naira(d.plan.example_minor), b: naira(d.plan.example_major), cap: p.cap_percent })) : null}
          {promise(t('prot.warrantyTitle'), t('prot.warranty', { n: p.warranty_days }))}
          {promise(t('prot.concernTitle'), t('prot.concern', { n: p.reply_days }))}
          {promise(t('prot.exitTitle'), t('prot.exit', { n: p.exit_breaches, days: p.exit_window_days }))}
          {d.exit_right ? <Banner tone="amber">{t('prot.exitOpen')}</Banner> : null}
          {(concerns.data?.results ?? []).length ? <SectionLabel>{t('prot.yourConcerns')}</SectionLabel> : null}
          {concerns.data?.results.map((c) => (
            <Card key={c.id} tone={c.status === 'RESOLVED' ? undefined : 'amber'}>
              <Between>
                <Heading className="flex-1 text-[16px]">{c.category_label}</Heading>
                <Pill label={c.status_label} tone={c.status === 'RESOLVED' ? 'leaf' : 'amber'} />
              </Between>
              <Small lines={3}>{c.description}</Small>
              {c.latest_update ? <Text className="text-sm text-ink">{c.latest_update}</Text> : null}
              {c.resolution ? <Text className="text-sm text-leaf-ink">{c.resolution}</Text> : null}
              <Small>{[c.owner?.name, c.status !== 'RESOLVED' ? t('am.replyBy', { day: day(c.reply_due) }) : ''].filter(Boolean).join(' · ')}</Small>
            </Card>
          ))}
        </>
      ) : null}
      <RaiseConcern open={raising} onClose={() => setRaising(false)} data={concerns.data} />
    </Screen>
  );
}

function RaiseConcern({ open, onClose, data }: { open: boolean; onClose: () => void; data?: Concerns }) {
  const t = useT();
  const { run, busy } = useAction();
  const [category, setCategory] = useState<string | null>(null);
  const [job, setJob] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function send() {
    setErrors({});
    try {
      await run('/protections/concerns/', { body: { category, description, job }, invalidate: ['/protections/'], success: t('prot.raised', { n: data?.reply_days ?? 2 }), toastError: false });
      setDescription('');
      setCategory(null);
      onClose();
    } catch (e) {
      setErrors(fieldErrors(e));
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('prot.raise')} sub={t('prot.raiseSub', { n: data?.reply_days ?? 2 })} footer={<Button title={t('common.send')} busy={busy} onPress={send} />}>
      <OptionCards label={t('prot.about')} options={data?.categories ?? []} value={category} onChange={setCategory} error={errors.category} />
      {data?.jobs.length ? <SelectField label={t('prot.whichVisit')} value={job} onChange={setJob} options={[{ key: '', label: t('prot.noVisit') }, ...data.jobs.map((j) => ({ key: String(j.id), label: j.label }))]} /> : null}
      <Field label={t('prot.whatHappened')} placeholder={t('ph.prot.whatHappened')} value={description} onChangeText={setDescription} multiline error={errors.description} />
    </Sheet>
  );
}
