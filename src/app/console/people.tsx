import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import { Avatar, Banner, Between, Button, Card, Empty, Failed, Field, IconButton, icons, Loading, Pill, Screen, Segmented, Sheet, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { ago } from '@/lib/format';
import { ConsoleGate } from '@/screens/staff/Console';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { Choice, Person } from '@/types/api';

export type PersonRow = Person & { username: string; last_name?: string; email: string; role_label: string; is_active: boolean; last_login: string | null; date_joined: string; language: string };
type People = { roles: Choice[]; count: number; page: number; pages: number; results: PersonRow[] };

function PeoplePage() {
  const t = useT();
  const [show, setShow] = useState<'staff' | 'clients' | 'inactive' | 'all'>('staff');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);
  const qs = new URLSearchParams({ show, page: String(page), ...(term ? { q: term } : {}) }).toString();
  const q = useResource<People>(`/console/people/?${qs}`);
  const d = q.data;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('console.peopleTitle'), headerRight: () => <IconButton icon={icons.plus} label={t('console.addStaff')} variant="primary" onPress={() => setAdding(true)} /> }} />
      <Segmented
        value={show}
        onChange={(k) => {
          setShow(k);
          setPage(1);
        }}
        options={[
          { key: 'staff', label: t('console.staff') },
          { key: 'clients', label: t('console.clients') },
          { key: 'inactive', label: t('console.inactive') },
          { key: 'all', label: t('common.all') },
        ]}
      />
      <Field label={t('common.search')} placeholder={t('ph.common.search')} icon={icons.search} value={search} onChangeText={(v) => { setSearch(v); setPage(1); }} autoCapitalize="none" />
      {q.isLoading ? <Loading rows={5} /> : null}
      {q.error && !d ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d && !d.results.length ? <Empty title={t('common.none')} icon={icons.people} /> : null}
      {d?.results.map((p) => (
        <Card key={p.id} onPress={() => router.push(`/console/person/${p.id}`)}>
          <View className="flex-row items-center gap-3">
            <Avatar url={p.avatar_url} initials={p.initials} size={40} />
            <View className="flex-1">
              <Between>
                <Text className="flex-1 text-[15px] font-semibold text-navy" numberOfLines={1}>
                  {p.name}
                </Text>
                {!p.is_active ? <Pill label={t('console.off')} tone="grey" /> : null}
              </Between>
              <Small lines={1}>{[p.role_label, p.phone || p.email, p.last_login ? t('console.seen', { when: ago(p.last_login) }) : ''].filter(Boolean).join(' · ')}</Small>
            </View>
          </View>
        </Card>
      ))}
      {d && d.pages > 1 ? (
        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="secondary" title={t('common.previous')} disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
          <Small>{t('console.page', { n: d.page, of: d.pages })}</Small>
          <Button size="sm" variant="secondary" title={t('common.next')} disabled={page >= d.pages} onPress={() => setPage((p) => p + 1)} />
        </View>
      ) : null}
      <AddStaff open={adding} onClose={() => setAdding(false)} roles={(d?.roles ?? []).filter((r) => r.key !== 'CLIENT')} />
    </Screen>
  );
}

function AddStaff({ open, onClose, roles }: { open: boolean; onClose: () => void; roles: Choice[] }) {
  const t = useT();
  const { run, busy } = useAction();
  const blank = { username: '', first_name: '', last_name: '', email: '', phone_number: '', role: '', confirm_password: '' };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof blank) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  async function save() {
    setErrors({});
    try {
      await run('/console/people/', { body: form, invalidate: ['/console/'], toastError: false });
      setForm(blank);
      onClose();
    } catch (e) {
      setErrors(fieldErrors(e));
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('console.addStaff')} sub={t('console.addStaffSub')} footer={<Button title={t('console.add')} busy={busy} onPress={save} />}>
      <Field label={t('console.username')} placeholder={t('ph.console.username')} value={form.username} onChangeText={set('username')} autoCapitalize="none" error={errors.username} />
      <Field label={t('me.firstName')} placeholder={t('ph.me.firstName')} value={form.first_name} onChangeText={set('first_name')} error={errors.first_name} />
      <Field label={t('me.lastName')} placeholder={t('ph.me.lastName')} value={form.last_name} onChangeText={set('last_name')} error={errors.last_name} />
      <Field label={t('auth.emailRequired')} placeholder={t('ph.auth.emailRequired')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} value={form.phone_number} onChangeText={set('phone_number')} keyboardType="phone-pad" error={errors.phone_number} />
      <SelectField label={t('console.role')} value={form.role} options={roles} onChange={set('role')} error={errors.role} searchable={false} />
      {form.role === 'ADMIN' ? (
        <>
          <Banner tone="amber">{t('console.pmConfirm')}</Banner>
          <Field label={t('console.yourPassword')} placeholder={t('ph.console.yourPassword')} value={form.confirm_password} onChangeText={set('confirm_password')} secureTextEntry error={errors.confirm_password} />
        </>
      ) : null}
    </Sheet>
  );
}

export default function PeopleScreen() {
  return (
    <ConsoleGate>
      <PeoplePage />
    </ConsoleGate>
  );
}
