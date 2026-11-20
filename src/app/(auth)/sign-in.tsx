import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AuthHeader } from '@/components/AuthHeader';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Button, Field, icons, RevealContext, SCROLL_THROTTLE, useKeyboardInset, useRevealingScroll, type FieldRef, type ViewRef } from '@/components/ui';
import { useT } from '@/i18n';
import { notify } from '@/lib/toast';
import { clearError, rules, useValidate } from '@/lib/validate';
import type { ApiFailure } from '@/types/api';

/** One sign-in for everyone: customers, engineers and the office. */
export default function SignIn() {
  const t = useT();
  const { signIn } = useSession();
  const passwordRef = useRef<FieldRef>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const check = useValidate();
  const frame = useRef<ViewRef>(null);
  const keyboard = useKeyboardInset(frame);
  const { ref: scrollRef, onScroll, reveal } = useRevealingScroll();

  async function submit() {
    const found = check({ username, password }, { username: [rules.identifier], password: [rules.required] });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await signIn(username.trim(), password);
      router.replace('/');
    } catch (e) {
      notify.error((e as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View ref={frame} className="flex-1 bg-page" style={{ paddingBottom: keyboard }}>
      <RevealContext.Provider value={reveal}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={SCROLL_THROTTLE}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        <AuthHeader sub={t('auth.tagline')} />
        <View className="-mt-5 mx-4 gap-4 rounded-3xl border border-line bg-surface p-5">
          <Text className="text-xl font-bold text-navy">{t('auth.welcomeBack')}</Text>
          <Field
            label={t('auth.username')} placeholder={t('ph.auth.username')}
            icon={icons.person}
            value={username}
            onChangeText={(v) => {
              setUsername(v);
              clearError(setErrors, 'username');
            }}
            error={errors.username}
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
            onChangeText={(v) => {
              setPassword(v);
              clearError(setErrors, 'password');
            }}
            error={errors.password}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Button title={t('common.signIn')} onPress={submit} busy={busy} size="lg" />
          <Pressable accessibilityRole="link" onPress={() => router.push('/forgot')} className="self-center py-1" hitSlop={8}>
            <Text className="text-[15px] font-semibold text-accent">{t('auth.forgot')}</Text>
          </Pressable>
        </View>
        <View className="mx-4 mt-4 gap-3">
          <View className="flex-row items-center justify-center gap-1.5">
            <Text className="text-[15px] text-muted">{t('auth.noAccount')}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/sign-up')} hitSlop={8}>
              <Text className="text-[15px] font-semibold text-accent">{t('auth.createFree')}</Text>
            </Pressable>
          </View>
          <Button title={t('auth.emergency')} variant="danger" icon={icons.bolt} onPress={() => router.push('/help/emergency')} />
          <View className="items-center pt-2">
            <LanguageSwitch />
          </View>
        </View>
      </ScrollView>
      </RevealContext.Provider>
    </View>
  );
}
