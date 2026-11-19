import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { api } from '@/api/client';
import { Body, Button, Card, ErrorText, Field, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import type { ApiFailure, CodeCheck, HelpRequest } from '@/types/api';

/** A guest's emergency or repair waits for the code sent to their phone, then goes to Dispatch. */
export default function ConfirmRequest() {
  const t = useT();
  const params = useLocalSearchParams<{ check: string; to: string }>();
  const [code, setCode] = useState('');
  const [to, setTo] = useState(params.to ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(value = code) {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 6) return;
    setBusy(true);
    setError('');
    try {
      const res = await api<{ request: HelpRequest }>(`/codes/${params.check}/verify/`, { method: 'POST', auth: false, body: { code: digits } });
      notify.success(t('help.sent'));
      router.replace(`/request/${res.request.token}`);
    } catch (e) {
      setError((e as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      const res = await api<CodeCheck>(`/codes/${params.check}/resend/`, { method: 'POST', auth: false });
      setTo(res.sent_to);
      notify.info(t('auth.codeSentAgain', { to: res.sent_to }));
    } catch (e) {
      setError((e as ApiFailure).message);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Title>{t('auth.codeTitle')}</Title>
      <Body>{t('help.codeSub', { to })}</Body>
      <Card>
        <Field label={t('auth.code')} value={code} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={7} autoFocus placeholder="••••••"
          onChangeText={(v) => {
            setCode(v);
            if (v.replace(/\D/g, '').length === 6) submit(v);
          }} />
        <ErrorText>{error}</ErrorText>
        <Button title={t('help.confirmSend')} variant="danger" busy={busy} onPress={() => submit()} size="lg" />
        <Button title={t('auth.resend')} variant="ghost" onPress={resend} />
      </Card>
    </Screen>
  );
}
