import { useState } from 'react';

import { api } from '@/api/client';
import { Banner, Body, Button, Card, ErrorText, Field, icons, Screen, Title } from '@/components/ui';
import { useT } from '@/i18n';
import type { ApiFailure } from '@/types/api';

/** Sends the same reset link as the website. The answer never reveals
 * whether an account exists. */
export default function Forgot() {
  const t = useT();
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!identifier.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await api<{ detail: string }>('/auth/forgot/', { method: 'POST', auth: false, body: { identifier: identifier.trim() } });
      setSent(res.detail);
    } catch (e) {
      setError((e as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>{t('auth.forgotTitle')}</Title>
      <Body>{t('auth.forgotHelp')}</Body>
      <Card>
        <Field label={t('auth.identifier')} placeholder={t('ph.auth.identifier')} icon={icons.person} autoCapitalize="none" autoComplete="username" value={identifier} onChangeText={setIdentifier}
          returnKeyType="send" onSubmitEditing={submit} />
        <ErrorText>{error}</ErrorText>
        <Button title={t('auth.sendLink')} onPress={submit} busy={busy} size="lg" />
      </Card>
      {sent ? <Banner tone="leaf">{sent}</Banner> : null}
    </Screen>
  );
}
