import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { api } from '@/api/client';
import { Body, Button, Card, CodeInput, Field, icons, Screen, Small, Title, type FieldRef } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { clearError, rules, useValidate } from '@/lib/validate';
import { fieldErrors } from '@/store/hooks';
import type { ApiFailure } from '@/types/api';

type Step = 'who' | 'code' | 'password';
type Started = { check: string; detail: string; resend_in: number };

/**
 * A forgotten password, by code, the same three steps as the website
 * (apps/accounts/reset.py): who you are (phone, email or username), the
 * 6-digit code sent to a contact on the account, then a new password.
 * The server never says whether an account was found.
 */
export default function Forgot() {
  const t = useT();
  const check = useValidate();
  const [step, setStep] = useState<Step>('who');
  const [identifier, setIdentifier] = useState('');
  const [started, setStarted] = useState<Started | null>(null);
  const [code, setCode] = useState('');
  const [form, setForm] = useState({ new_password1: '', new_password2: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const again = useRef<FieldRef>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function attempt(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      const fields = fieldErrors(e);
      setErrors(fields);
      if (!Object.keys(fields).length) notify.error((e as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  const start = () => {
    const found = check({ identifier }, { identifier: [rules.identifier] });
    setErrors(found);
    if (Object.keys(found).length) return;
    return attempt(async () => {
      const res = await api<Started>('/auth/forgot/', { method: 'POST', auth: false, body: { identifier: identifier.trim() } });
      setStarted(res);
      setWait(res.resend_in || 40);
      setCode('');
      setStep('code');
    });
  };

  const verify = (value = code) => {
    const found = check({ code: value }, { code: [rules.code] });
    setErrors(found);
    if (Object.keys(found).length || !started) return;
    return attempt(async () => {
      await api(`/auth/forgot/${started.check}/verify/`, { method: 'POST', auth: false, body: { code: value } });
      setStep('password');
    });
  };

  const resend = () =>
    started &&
    attempt(async () => {
      const res = await api<Started>(`/auth/forgot/${started.check}/resend/`, { method: 'POST', auth: false });
      setWait(res.resend_in || 40);
      setCode('');
      setErrors({});
      notify.info(t('reset.sentAgain'));
    });

  const save = () => {
    const found = check(form, { new_password1: [rules.password], new_password2: [rules.required, rules.sameAs('new_password1')] });
    setErrors(found);
    if (Object.keys(found).length || !started) return;
    return attempt(async () => {
      const res = await api<{ detail: string }>(`/auth/forgot/${started.check}/password/`, { method: 'POST', auth: false, body: form });
      notify.success(res.detail);
      router.replace('/sign-in');
    });
  };

  return (
    <Screen
      footer={
        step === 'who' ? (
          <Button title={t('reset.sendCode')} icon={icons.send} onPress={start} busy={busy} size="lg" />
        ) : step === 'code' ? (
          <Button title={t('common.continue')} onPress={() => verify()} busy={busy} size="lg" />
        ) : (
          <Button title={t('reset.setPassword')} onPress={save} busy={busy} size="lg" />
        )
      }>
      <Steps step={step} />
      {step === 'who' ? (
        <>
          <Title>{t('auth.forgotTitle')}</Title>
          <Body>{t('reset.whoHelp')}</Body>
          <Card>
            <Field
              label={t('auth.identifier')}
              placeholder={t('ph.auth.identifier')}
              icon={icons.person}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              value={identifier}
              onChangeText={(v) => {
                setIdentifier(v);
                clearError(setErrors, 'identifier');
              }}
              error={errors.identifier}
              returnKeyType="send"
              onSubmitEditing={start}
            />
          </Card>
        </>
      ) : step === 'code' ? (
        <>
          <Title>{t('reset.codeTitle')}</Title>
          <Body>{started?.detail}</Body>
          <Card>
            <CodeInput
              label={t('auth.code')}
              value={code}
              onChange={(v) => {
                setCode(v);
                clearError(setErrors, 'code');
              }}
              onComplete={verify}
              error={errors.code}
              autoFocus
              disabled={busy}
            />
            <Button
              title={wait > 0 ? t('auth.resendIn', { s: wait }) : t('auth.resend')}
              variant="secondary"
              disabled={wait > 0 || busy}
              onPress={resend}
            />
            <Button title={t('reset.different')} variant="ghost" onPress={() => setStep('who')} />
          </Card>
          <Small className="text-center">{t('reset.noCode')}</Small>
        </>
      ) : (
        <>
          <Title>{t('reset.newTitle')}</Title>
          <Body>{t('reset.newHelp')}</Body>
          <Card>
            <Field
              label={t('me.newPassword')}
              placeholder={t('ph.me.newPassword')}
              value={form.new_password1}
              onChangeText={(v) => {
                setForm((f) => ({ ...f, new_password1: v }));
                clearError(setErrors, 'new_password1');
              }}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              hint={t('auth.passwordHint')}
              error={errors.new_password1}
              returnKeyType="next"
              onSubmitEditing={() => again.current?.focus()}
              autoFocus
            />
            <Field
              ref={again}
              label={t('me.newPasswordAgain')}
              placeholder={t('ph.me.newPasswordAgain')}
              value={form.new_password2}
              onChangeText={(v) => {
                setForm((f) => ({ ...f, new_password2: v }));
                clearError(setErrors, 'new_password2');
              }}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              error={errors.new_password2}
              returnKeyType="go"
              onSubmitEditing={save}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

function Steps({ step }: { step: Step }) {
  const order: Step[] = ['who', 'code', 'password'];
  const at = order.indexOf(step);
  return (
    <View className="flex-row gap-1.5 pt-1" accessibilityRole="progressbar" accessibilityValue={{ now: at + 1, min: 1, max: 3 }}>
      {order.map((s, i) => (
        <View key={s} className={i <= at ? 'h-1.5 flex-1 rounded-full bg-brand' : 'h-1.5 flex-1 rounded-full bg-line'} />
      ))}
    </View>
  );
}
