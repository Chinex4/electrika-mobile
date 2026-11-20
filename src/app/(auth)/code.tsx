import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { Body, Button, Card, CodeInput, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import type { ApiFailure, CodeCheck } from '@/types/api';

/** The 6-digit code that confirms a new account. */
export default function Code() {
  const t = useT();
  const { verifyCode } = useSession();
  const params = useLocalSearchParams<{ check: string; to: string; email?: string }>();
  const [code, setCode] = useState('');
  const [to, setTo] = useState(params.to ?? '');
  const [canEmail, setCanEmail] = useState(params.email === '1');
  const [wait, setWait] = useState(40);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function submit(value = code) {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 6) return setError(t('v.code'));
    setBusy(true);
    setError('');
    try {
      await verifyCode(params.check, digits);
      notify.success(t('auth.welcome'));
      router.replace('/');
    } catch (e) {
      setError((e as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  async function resend(byEmail = false) {
    setError('');
    try {
      const res = await api<CodeCheck>(`/codes/${params.check}/resend/`, { method: 'POST', auth: false, body: byEmail ? { by_email: true } : {} });
      setTo(res.sent_to);
      setCanEmail(res.can_email);
      setWait(res.resend_in || 40);
      notify.info(t('auth.codeSentAgain', { to: res.sent_to }));
    } catch (e) {
      notify.error((e as ApiFailure).message);
    }
  }

  return (
    <Screen>
        <Title>{t('auth.codeTitle')}</Title>
        <Body>{t('auth.codeSent', { to })}</Body>
        <Card>
          <CodeInput
            label={t('auth.code')}
            value={code}
            onChange={(v) => {
              setCode(v);
              setError('');
            }}
            onComplete={submit}
            error={error || undefined}
            autoFocus
            disabled={busy}
          />
          <Button title={t('common.continue')} onPress={() => submit()} busy={busy} size="lg" />
          <Button title={wait > 0 ? t('auth.resendIn', { s: wait }) : t('auth.resend')} variant="secondary" disabled={wait > 0} onPress={() => resend()} />
          {canEmail ? <Button title={t('auth.byEmail')} variant="ghost" onPress={() => resend(true)} /> : null}
        </Card>
    </Screen>
  );
}
