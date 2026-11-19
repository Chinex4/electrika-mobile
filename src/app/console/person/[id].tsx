import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import { Avatar, Banner, Button, Card, ConfirmSheet, Failed, Field, Heading, icons, KeyValue, ListGroup, Loading, Pill, Row, Screen, SectionLabel, Sheet, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { ago, day, when } from '@/lib/format';
import { useDraft } from '@/lib/useDraft';
import { ConsoleGate, type AuditRow } from '@/screens/staff/Console';
import { fieldErrors, useAction, useResource } from '@/store/hooks';

import type { PersonRow } from '../people';

type Detail = {
  person: PersonRow;
  is_self: boolean;
  phones: { name: string; platform: string; last_used_at: string | null }[];
  client: { id: number; name: string } | null;
  history: AuditRow[];
};

const ROLES = [
  { key: 'TECHNICIAN', label: 'Technician' },
  { key: 'DISPATCH_COORDINATOR', label: 'Dispatch Coordinator' },
  { key: 'ACCOUNT_MANAGER', label: 'Account Manager' },
  { key: 'ACCOUNTS', label: 'Accounts' },
  { key: 'ADMIN', label: 'Program Manager' },
  { key: 'CLIENT', label: 'Client' },
];
type Action = 'deactivate' | 'activate' | 'signout' | 'reset';

function PersonPage() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = `/console/people/${id}/`;
  const q = useResource<Detail>(path);
  const { run, busy } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const d = q.data;
  const p = d?.person;

  async function act(action: Action) {
    try {
      await run(`/console/people/${id}/${action}/`, { invalidate: ['/console/'] });
    } catch {
      // toast shown
    }
    setConfirm(null);
  }

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: p?.name ?? '' }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d && p ? (
        <>
          <Card>
            <View className="flex-row items-center gap-3">
              <Avatar url={p.avatar_url} initials={p.initials} size={56} />
              <View className="flex-1 gap-0.5">
                <Text className="text-[20px] font-bold text-navy">{p.name}</Text>
                <Small>{p.role_label}</Small>
              </View>
              <Pill label={p.is_active ? t('console.active') : t('console.off')} tone={p.is_active ? 'leaf' : 'grey'} />
            </View>
            <KeyValue label={t('console.username')} value={p.username} />
            <KeyValue label={t('auth.phone')} value={p.phone} />
            <KeyValue label={t('auth.emailRequired')} value={p.email} />
            <KeyValue label={t('console.joined')} value={day(p.date_joined)} />
            <KeyValue label={t('console.lastSeen')} value={p.last_login ? ago(p.last_login) : t('console.never')} />
            {d.client ? <KeyValue label={t('console.client')} value={d.client.name} /> : null}
            <Button title={t('me.editDetails')} variant="soft" size="sm" icon={icons.edit} onPress={() => setEditing(true)} />
          </Card>
          {d.is_self ? <Banner tone="info">{t('console.thisIsYou')}</Banner> : null}
          <SectionLabel>{t('console.access')}</SectionLabel>
          <ListGroup>
            <Row icon={icons.key} title={t('console.reset')} sub={t('console.resetSub')} onPress={() => setConfirm('reset')} />
            <Row icon={icons.logout} title={t('console.signout')} sub={t('console.signoutSub')} onPress={() => setConfirm('signout')} last={d.is_self} />
            {!d.is_self ? (
              p.is_active ? (
                <Row icon={icons.lock} tone="alert" destructive title={t('console.deactivate')} onPress={() => setConfirm('deactivate')} last />
              ) : (
                <Row icon={icons.check} tone="leaf" title={t('console.activate')} onPress={() => setConfirm('activate')} last />
              )
            ) : null}
          </ListGroup>
          {d.phones.length ? (
            <Card>
              <Heading>{t('console.phones')}</Heading>
              {d.phones.map((ph, i) => (
                <KeyValue key={i} label={ph.name || ph.platform} value={ph.last_used_at ? ago(ph.last_used_at) : '—'} />
              ))}
            </Card>
          ) : null}
          {d.history.length ? (
            <>
              <SectionLabel>{t('console.history')}</SectionLabel>
              <ListGroup>
                {d.history.map((h, i) => (
                  <Row key={h.id} title={h.summary} sub={[h.who?.name ?? '—', when(h.at)].join(' · ')} last={i === d.history.length - 1} />
                ))}
              </ListGroup>
            </>
          ) : null}
          <EditPerson open={editing} onClose={() => setEditing(false)} person={p} path={path} />
          <ConfirmSheet
            open={!!confirm}
            onClose={() => setConfirm(null)}
            title={confirm ? t(`console.${confirm}`) : ''}
            message={confirm ? t(`console.${confirm}Confirm`, { name: p.name }) : ''}
            confirm={confirm ? t(`console.${confirm}`) : ''}
            variant={confirm === 'deactivate' ? 'danger' : 'primary'}
            busy={busy}
            onConfirm={() => confirm && act(confirm)}
          />
        </>
      ) : null}
    </Screen>
  );
}

function EditPerson({ open, onClose, person, path }: { open: boolean; onClose: () => void; person: PersonRow; path: string }) {
  const t = useT();
  const { run, busy } = useAction();
  const [form, setForm] = useDraft(
    { first_name: person.first_name, last_name: person.last_name ?? person.name.split(' ').slice(1).join(' '), email: person.email, phone_number: person.phone, role: person.role as string, language: person.language || 'en', confirm_password: '' },
    open ? person.id : null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const pmChange = (form.role === 'ADMIN') !== (person.role === 'ADMIN');
  async function save() {
    setErrors({});
    try {
      await run(path, { method: 'PATCH', body: form, invalidate: ['/console/'], success: t('me.saved'), toastError: false });
      onClose();
    } catch (e) {
      setErrors(fieldErrors(e));
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('me.editDetails')} footer={<Button title={t('common.save')} busy={busy} onPress={save} />}>
      <Field label={t('me.firstName')} placeholder={t('ph.me.firstName')} value={form.first_name} onChangeText={set('first_name')} error={errors.first_name} />
      <Field label={t('me.lastName')} placeholder={t('ph.me.lastName')} value={form.last_name} onChangeText={set('last_name')} error={errors.last_name} />
      <Field label={t('auth.emailRequired')} placeholder={t('ph.auth.emailRequired')} value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} />
      <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} value={form.phone_number} onChangeText={set('phone_number')} keyboardType="phone-pad" error={errors.phone_number} />
      <SelectField label={t('console.role')} value={form.role} options={ROLES} onChange={set('role')} searchable={false} error={errors.role} />
      <SelectField label={t('common.language')} value={form.language} options={[{ key: 'en', label: 'English' }, { key: 'ig', label: 'Igbo' }]} onChange={set('language')} searchable={false} />
      {pmChange ? <Field label={t('console.yourPassword')} placeholder={t('ph.console.yourPassword')} value={form.confirm_password} onChangeText={set('confirm_password')} secureTextEntry error={errors.confirm_password} /> : null}
      {errors.__all__ ? <Text className="text-sm text-alert-ink">{errors.__all__}</Text> : null}
    </Sheet>
  );
}

export default function PersonScreen() {
  return (
    <ConsoleGate>
      <PersonPage />
    </ConsoleGate>
  );
}
