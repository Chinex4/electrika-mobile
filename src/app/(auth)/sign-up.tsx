import { router } from 'expo-router';
import { useState } from 'react';

import { useSession } from '@/auth/session';
import { Banner, Button, Card, Field, icons, Screen, Small, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { clearError, rules, useValidate } from '@/lib/validate';
import { fieldErrors, useResource } from '@/store/hooks';
import type { ApiFailure, Config } from '@/types/api';

/** A free account, as on the website: name, phone, optional email, password.
 * When codes are on, a code confirms the number (or email) first. */
export default function SignUp() {
  const t = useT();
  const { signUp } = useSession();
  const config = useResource<Config>('/config/', { auth: false });
  const emailRequired = config.data?.codes_by === 'EMAIL';
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const check = useValidate();
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    clearError(setErrors, k);
  };

  async function submit() {
    const found = check(form, {
      name: [rules.required],
      phone: [rules.required, rules.phone],
      email: emailRequired ? [rules.required, rules.email] : [rules.email],
      password: [rules.password],
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const { check } = await signUp(form);
      if (check) router.push({ pathname: '/code', params: { check: check.check, to: check.sent_to, email: check.can_email ? '1' : '' } });
      else router.replace('/');
    } catch (e) {
      const fields = fieldErrors(e);
      setErrors(fields);
      if (!Object.keys(fields).length) notify.error((e as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
        <Title sub={t('auth.signUpSub')}>{t('auth.createFree')}</Title>
        <Card>
          <Field label={t('auth.name')} placeholder={t('ph.auth.name')} icon={icons.person} autoComplete="name" textContentType="name" value={form.name} onChangeText={set('name')} error={errors.name} />
          <Field label={t('auth.phone')} placeholder={t('ph.auth.phone')} icon={icons.phone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
            value={form.phone} onChangeText={set('phone')} error={errors.phone} />
          <Field label={emailRequired ? t('auth.emailRequired') : t('auth.email')} placeholder={t('ph.auth.email')} keyboardType="email-address" autoCapitalize="none"
            autoComplete="email" textContentType="emailAddress" value={form.email} onChangeText={set('email')} error={errors.email}
            hint={emailRequired ? t('auth.emailCodeHint') : undefined} />
          <Field label={t('auth.newPassword')} placeholder={t('ph.auth.newPassword')} icon={icons.key} secureTextEntry autoComplete="new-password" textContentType="newPassword"
            hint={t('auth.passwordHint')} value={form.password} onChangeText={set('password')} error={errors.password} />
          <Button title={t('common.continue')} onPress={submit} busy={busy} size="lg" />
        </Card>
        <Banner tone="info">{t('auth.freeIncludes')}</Banner>
        <Small className="text-center">{t('auth.haveAccount')}</Small>
        <Button title={t('common.signIn')} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
