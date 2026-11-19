import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import { Between, brandColors, Button, Card, Empty, ErrorText, Failed, Field, Heading, Icon, IconButton, icons, Loading, Pill, Screen, Sheet, Small } from '@/components/ui';
import { useT } from '@/i18n';
import { useConfig } from '@/lib/config';
import { locateMe } from '@/lib/locate';
import { openMaps } from '@/lib/pay';
import { useDraft } from '@/lib/useDraft';
import { fieldErrors, useAction, useResource } from '@/store/hooks';
import type { ApiFailure, Site } from '@/types/api';

/** The customer's places: add one, edit it, and pin it from where they stand so engineers find it first time. */
export default function Places() {
  const t = useT();
  const q = useResource<{ results: Site[] }>('/customer/places/');
  const [editing, setEditing] = useState<Site | 'new' | null>(null);
  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: t('account.places'), headerRight: () => <IconButton icon={icons.plus} label={t('places.add')} variant="primary" onPress={() => setEditing('new')} /> }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.results.length ? <Empty title={t('places.none')} sub={t('places.noneSub')} icon={icons.pin} action={<Button title={t('places.add')} onPress={() => setEditing('new')} />} /> : null}
      {q.data?.results.map((s) => (
        <Card key={s.id} onPress={() => setEditing(s)}>
          <Between>
            <Heading className="flex-1">{s.name}</Heading>
            <Pill label={s.pinned ? t('places.pinned') : t('places.notPinned')} tone={s.pinned ? 'leaf' : 'amber'} />
          </Between>
          <Small>{[s.address_line || s.address, s.area_label, s.landmark].filter(Boolean).join(' · ')}</Small>
          {s.pinned ? (
            <View className="flex-row">
              <Button size="sm" variant="ghost" title={t('places.seeMap')} icon={icons.map} onPress={() => openMaps(s.lat, s.lng, s.name)} />
            </View>
          ) : null}
        </Card>
      ))}
      <PlaceSheet place={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function PlaceSheet({ place, onClose }: { place: Site | 'new' | null; onClose: () => void }) {
  const t = useT();
  const config = useConfig();
  const { run, busy } = useAction();
  const isNew = place === 'new';
  const key = place === 'new' ? 'new' : (place?.id ?? null);
  const existing = place && place !== 'new' ? place : null;
  const [form, setForm] = useDraft(
    existing ? { name: existing.name, address: existing.address, area: existing.area, landmark: existing.landmark } : { name: '', address: '', area: '', landmark: '' },
    key,
  );
  const [pin, setPin] = useDraft<{ lat: number; lng: number } | null>(existing && existing.lat != null && existing.lng != null ? { lat: existing.lat, lng: existing.lng } : null, key);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function here() {
    setLocating(true);
    try {
      const l = await locateMe(t('help.locationOff'));
      setPin({ lat: l.lat, lng: l.lng });
      if (!form.address && l.address) set('address')(l.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    setErrors({});
    setError('');
    try {
      await run(isNew ? '/customer/places/' : `/customer/places/${(place as Site).id}/`, {
        method: isNew ? 'POST' : 'PATCH',
        body: { ...form, lat: pin?.lat ?? null, lng: pin?.lng ?? null },
        invalidate: ['/customer/'],
        success: t('me.saved'),
        toastError: false,
      });
      onClose();
    } catch (e) {
      setErrors(fieldErrors(e));
      setError((e as ApiFailure).message);
    }
  }

  return (
    <Sheet open={!!place} onClose={onClose} title={isNew ? t('places.add') : t('places.edit')} footer={<Button title={t('common.save')} busy={busy} onPress={save} />}>
      <Field label={t('places.name')} value={form.name} onChangeText={set('name')} placeholder={t('places.nameHint')} error={errors.name} />
      <Field label={t('form.address')} placeholder={t('ph.form.address')} value={form.address} onChangeText={set('address')} autoComplete="street-address" error={errors.address} />
      <SelectField label={t('form.area')} value={form.area} onChange={set('area')} options={(config.data?.areas ?? []).map((a) => ({ key: a.key, label: a.label }))} error={errors.area} />
      <Field label={t('form.landmark')} value={form.landmark} onChangeText={set('landmark')} placeholder={t('form.landmarkHint')} />
      <Card tone={pin ? 'leaf' : undefined}>
        <View className="flex-row items-center gap-2">
          <Icon name={icons.pin} size={18} color={pin ? brandColors.leafInk : brandColors.muted} />
          <Heading className="flex-1 text-[15px]">{pin ? t('places.pinSet') : t('places.pinTitle')}</Heading>
        </View>
        <Small>{t('places.pinSub')}</Small>
        <View className="flex-row gap-2">
          <Button className="flex-1" size="sm" variant="soft" title={t('places.pinHere')} icon={icons.location} busy={locating} onPress={here} />
          {pin ? <Button size="sm" variant="ghost" title={t('places.unpin')} onPress={() => setPin(null)} /> : null}
        </View>
        {errors.pin ? <ErrorText>{errors.pin}</ErrorText> : null}
      </Card>
      <ErrorText>{Object.keys(errors).length ? '' : error}</ErrorText>
    </Sheet>
  );
}
