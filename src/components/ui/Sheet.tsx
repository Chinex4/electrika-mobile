/**
 * A modal sheet for quick tasks (choose an engineer, add a note, confirm),
 * so the app needs fewer full screens. iOS shows its native page sheet
 * (Liquid Glass on iOS 26); Android slides a card up over a dimmed page.
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';

import { Button, type ButtonVariant } from './controls';
import { brandColors, Icon, icons } from './Icon';

export function Sheet({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const ios = Platform.OS === 'ios';
  const head = (
    <View className="flex-row items-start gap-3 px-5 pb-2 pt-5">
      <View className="flex-1 gap-1">
        <Text className="text-xl font-bold text-navy">{title}</Text>
        {sub ? <Text className="text-sm text-muted">{sub}</Text> : null}
      </View>
      <Pressable accessibilityLabel="Close" onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-mist active:opacity-70">
        <Icon name={icons.close} size={14} color={brandColors.muted} />
      </Pressable>
    </View>
  );
  const body = (
    <>
      {head}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
        {children}
      </ScrollView>
      {footer ? (
        <View className="gap-2 border-t border-line px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          {footer}
        </View>
      ) : (
        <View style={{ height: Math.max(insets.bottom, 16) }} />
      )}
    </>
  );

  if (ios) {
    return (
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <KeyboardAvoidingView behavior="padding" className="flex-1 bg-page">
          {body}
        </KeyboardAvoidingView>
      </Modal>
    );
  }
  return (
    <Modal visible={open} animationType="slide" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="height" className="flex-1 justify-end">
        <Pressable accessibilityLabel="Close" onPress={onClose} className="absolute inset-0 bg-black/40" />
        <View className="max-h-[88%] rounded-t-[28px] bg-page">
          <View className="items-center pt-2.5">
            <View className="h-1.5 w-10 rounded-full bg-edge" />
          </View>
          {body}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** "Are you sure?" as a sheet, for anything that can't easily be undone. */
export function ConfirmSheet({
  open,
  onClose,
  title,
  message,
  confirm,
  onConfirm,
  busy,
  variant = 'danger',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirm: string;
  onConfirm: () => void;
  busy?: boolean;
  variant?: ButtonVariant;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button title={confirm} variant={variant} busy={busy} onPress={onConfirm} />
          <Button title={t('common.notNow')} variant="ghost" onPress={onClose} />
        </>
      }>
      {message ? <Text className="text-[15px] leading-[22px] text-ink">{message}</Text> : null}
      {children}
    </Sheet>
  );
}
