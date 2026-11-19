import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import {
  Avatar,
  Banner,
  Button,
  Choices,
  ConfirmSheet,
  ErrorText,
  Field,
  HeroCard,
  Icon,
  icons,
  ListGroup,
  pickPhoto,
  Row,
  Screen,
  SectionLabel,
  Sheet,
  Small,
} from '@/components/ui';
import { useT } from '@/i18n';
import { FALLBACK_SUPPORT_PHONE, useConfig } from '@/lib/config';
import { call, whatsapp } from '@/lib/pay';
import { notify } from '@/lib/toast';
import { useDraft } from '@/lib/useDraft';
import { pushIsOn, registerForPush } from '@/notifications/push';
import { fieldErrors, useAction } from '@/store/hooks';
import type { ApiFailure } from '@/types/api';

import { TechIdCard } from './staff/TechIdCard';

/** The person's own page, for every role. Engineers get their ID card on top. */
export function MeScreen({ children }: { children?: ReactNode }) {
  const t = useT();
  const { user, signOut, setPhoto } = useSession();
  const config = useConfig();
  const support = config.data?.support_phone ?? FALLBACK_SUPPORT_PHONE;
  const [push, setPush] = useState<boolean | null>(null);
  const [sheet, setSheet] = useState<null | 'details' | 'password' | 'photo' | 'signout'>(null);

  useEffect(() => {
    pushIsOn().then(setPush).catch(() => setPush(false));
  }, []);

  if (!user) return null;

  async function changePhoto(source: 'camera' | 'library' | 'remove') {
    setSheet(null);
    try {
      if (source === 'remove') await setPhoto(null);
      else {
        const uri = await pickPhoto(source, true);
        if (!uri) return;
        await setPhoto(uri);
      }
      notify.success(t('me.photoSaved'));
    } catch (e) {
      notify.error((e as ApiFailure).message);
    }
  }

  return (
    <Screen tabbed>
      <HeroCard tone={user.role === 'CLIENT' ? 'brand' : 'navy'}>
        <View className="flex-row items-center gap-4">
          <Pressable accessibilityLabel={t('me.photo')} onPress={() => setSheet('photo')}>
            <Avatar url={user.avatar_url} initials={user.initials} size={64} tone="white" />
            <View className="absolute -bottom-0.5 -right-0.5 h-6 w-6 items-center justify-center rounded-full bg-white">
              <Icon name={icons.camera} size={12} />
            </View>
          </Pressable>
          <View className="flex-1 gap-0.5">
            <Text className="text-[22px] font-bold text-white" numberOfLines={1}>
              {user.name}
            </Text>
            <Text className="text-sm text-white/85">{user.role_label}</Text>
            <Text className="text-[13px] text-white/75" numberOfLines={1}>
              {user.phone_number || user.email}
            </Text>
          </View>
        </View>
      </HeroCard>

      {user.role === 'TECHNICIAN' ? <TechIdCard /> : null}
      {children}

      <SectionLabel>{t('me.details')}</SectionLabel>
      <ListGroup>
        <Row icon={icons.edit} title={t('me.editDetails')} sub={[user.first_name, user.last_name].filter(Boolean).join(' ')} onPress={() => setSheet('details')} />
        <Row icon={icons.key} title={t('me.password')} onPress={() => setSheet('password')} />
        <Row icon={icons.phoneDevice} title={t('me.devices')} sub={t('me.devicesSub')} onPress={() => router.push('/me/devices')} />
        <Row
          icon={icons.bell}
          tone={push ? 'leaf' : 'amber'}
          title={push ? t('me.pushOn') : t('me.pushOff')}
          sub={t('me.notificationsSub')}
          onPress={async () => {
            if (!push) {
              const ok = await registerForPush();
              setPush(ok || (await pushIsOn()));
              if (!ok) notify.info(t('me.pushNeedsBuild'));
            }
            router.push('/me/notifications');
          }}
          last
        />
      </ListGroup>

      <SectionLabel>{t('common.language')}</SectionLabel>
      <View className="items-start">
        <LanguageSwitch />
      </View>

      <SectionLabel>{t('me.help')}</SectionLabel>
      <ListGroup>
        <Row icon={icons.phone} tone="leaf" title={t('me.call')} sub={support} onPress={() => call(support)} />
        <Row icon={{ sf: 'message.fill', md: 'chat' }} tone="leaf" title={t('me.whatsapp')} onPress={() => whatsapp(support)} />
        <Row icon={icons.shield} title={t('me.safety')} onPress={() => router.push('/care/safety')} last />
      </ListGroup>

      <View className="mt-3">
        <Button title={t('common.signOut')} variant="secondary" icon={icons.logout} onPress={() => setSheet('signout')} />
      </View>
      <Small className="text-center">{t('me.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}</Small>

      <DetailsSheet open={sheet === 'details'} onClose={() => setSheet(null)} />
      <PasswordSheet open={sheet === 'password'} onClose={() => setSheet(null)} />
      <Sheet open={sheet === 'photo'} onClose={() => setSheet(null)} title={t('me.photo')}>
        <ListGroup>
          <Row icon={icons.camera} title={t('common.takePhoto')} onPress={() => changePhoto('camera')} />
          <Row icon={icons.photo} title={t('common.choosePhoto')} onPress={() => changePhoto('library')} last={!user.avatar_url} />
          {user.avatar_url ? <Row icon={icons.trash} tone="alert" destructive title={t('me.removePhoto')} onPress={() => changePhoto('remove')} last /> : null}
        </ListGroup>
      </Sheet>
      <ConfirmSheet
        open={sheet === 'signout'}
        onClose={() => setSheet(null)}
        title={t('me.signOutTitle')}
        message={t('me.signOutSub')}
        confirm={t('common.signOut')}
        onConfirm={async () => {
          setSheet(null);
          await signOut();
          router.replace('/sign-in');
        }}
      />
    </Screen>
  );
}

function DetailsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { user, updateMe } = useSession();
  const [form, setForm] = useDraft(
    { first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', email: user?.email ?? '', preferred_channel: user?.preferred_channel || 'SMS' },
    open,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const patch = user?.role === 'CLIENT' ? form : { first_name: form.first_name, last_name: form.last_name, email: form.email };
      await updateMe(patch);
      notify.success(t('me.saved'));
      onClose();
    } catch (e) {
      setErrors(fieldErrors(e));
      notify.error((e as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('me.editDetails')} sub={t('me.phoneByOffice')} footer={<Button title={t('common.save')} busy={busy} onPress={save} />}>
      <Field label={t('me.firstName')} placeholder={t('ph.me.firstName')} value={form.first_name} onChangeText={set('first_name')} autoComplete="given-name" error={errors.first_name} />
      <Field label={t('me.lastName')} placeholder={t('ph.me.lastName')} value={form.last_name} onChangeText={set('last_name')} autoComplete="family-name" error={errors.last_name} />
      <Field label={t('auth.emailRequired')} placeholder={t('ph.auth.emailRequired')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email} />
      {user?.role === 'CLIENT' ? (
        <Choices
          label={t('me.channel')}
          value={form.preferred_channel}
          onChange={set('preferred_channel')}
          options={[
            { key: 'SMS', label: t('me.bySms') },
            { key: 'EMAIL', label: t('me.byEmail') },
          ]}
          error={errors.preferred_channel}
        />
      ) : null}
    </Sheet>
  );
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { run, busy } = useAction();
  const [form, setForm] = useState({ old_password: '', new_password1: '', new_password2: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setErrors({});
    setError('');
    try {
      await run('/me/password/', { body: form, toastError: false });
      setForm({ old_password: '', new_password1: '', new_password2: '' });
      onClose();
    } catch (e) {
      const f = fieldErrors(e);
      setErrors(f);
      if (!Object.keys(f).length) setError((e as ApiFailure).message);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('me.password')} footer={<Button title={t('me.changePassword')} busy={busy} onPress={save} />}>
      <Banner tone="info">{t('me.passwordOtherPhones')}</Banner>
      <Field label={t('me.currentPassword')} placeholder={t('ph.me.currentPassword')} value={form.old_password} onChangeText={set('old_password')} secureTextEntry autoComplete="current-password" error={errors.old_password} />
      <Field label={t('me.newPassword')} placeholder={t('ph.me.newPassword')} value={form.new_password1} onChangeText={set('new_password1')} secureTextEntry autoComplete="new-password" hint={t('auth.passwordHint')} error={errors.new_password1} />
      <Field label={t('me.newPasswordAgain')} placeholder={t('ph.me.newPasswordAgain')} value={form.new_password2} onChangeText={set('new_password2')} secureTextEntry autoComplete="new-password" error={errors.new_password2} />
      <ErrorText>{error}</ErrorText>
    </Sheet>
  );
}
