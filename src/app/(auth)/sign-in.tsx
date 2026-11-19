import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AuthHeader } from '@/components/AuthHeader';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Button, ErrorText, Field, icons, type FieldRef } from '@/components/ui';
import { useT } from '@/i18n';
import type { ApiFailure } from '@/types/api';

/** One sign-in for everyone: customers, engineers and the office. */
export default function SignIn() {
  const t = useT();
  const { signIn } = useSession();
  const passwordRef = useRef<FieldRef>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!username.trim() || !password) return setError(t('auth.fillBoth'));
    setBusy(true);
    setError('');
    try {
      await signIn(username.trim(), password);
      router.replace('/');
    } catch (e) {
      setError((e as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-page" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        <AuthHeader title="ElectriKa" sub={t('auth.tagline')} />
        <View className="-mt-5 mx-4 gap-4 rounded-3xl border border-line bg-white p-5">
          <Text className="text-xl font-bold text-navy">{t('auth.welcomeBack')}</Text>
          <Field
            label={t('auth.username')} placeholder={t('ph.auth.username')}
            icon={icons.person}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Field
            ref={passwordRef}
            label={t('auth.password')} placeholder={t('ph.auth.password')}
            icon={icons.key}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <ErrorText>{error}</ErrorText>
          <Button title={t('common.signIn')} onPress={submit} busy={busy} size="lg" />
          <Link href="/forgot" className="self-center py-1 text-[15px] font-semibold text-brand">
            {t('auth.forgot')}
          </Link>
        </View>
        <View className="mx-4 mt-4 gap-3">
          <View className="flex-row items-center justify-center gap-1.5">
            <Text className="text-[15px] text-muted">{t('auth.noAccount')}</Text>
            <Link href="/sign-up" className="text-[15px] font-semibold text-brand">
              {t('auth.createFree')}
            </Link>
          </View>
          <Button title={t('auth.emergency')} variant="danger" icon={icons.bolt} onPress={() => router.push('/help/emergency')} />
          <View className="items-center pt-2">
            <LanguageSwitch />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
