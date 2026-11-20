/**
 * A modal sheet for quick tasks (choose an engineer, add a note, confirm),
 * so the app needs fewer full screens.
 *
 * A card that slides up from the bottom and is only as tall as what's in
 * it: two options make a short sheet, a long form grows up to 90% of the
 * screen and scrolls. (It used to be iOS's page sheet, which is always
 * nearly full height, so short sheets were mostly empty.) With the keyboard
 * up, the card rides above it and the focused field scrolls into view.
 */
import { useRef, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';

import { Button, type ButtonVariant } from './controls';
import { Icon, icons } from './Icon';
import { RevealContext, useKeyboardInset, useRevealingScroll, SCROLL_THROTTLE, type ViewRef } from './keyboard';
import { useColors } from '@/theme';

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
  const colors = useColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const frame = useRef<ViewRef>(null);
  const keyboard = useKeyboardInset(frame);
  const { ref: scrollRef, onScroll, reveal } = useRevealingScroll();
  const room = height - keyboard - Math.max(insets.top, 24) - 12;

  return (
    <Modal visible={open} animationType="slide" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View ref={frame} className="flex-1 justify-end" style={{ paddingBottom: keyboard }}>
        <Pressable accessibilityLabel={t('common.close')} onPress={onClose} className="absolute inset-0 bg-black/40" />
        <View className="rounded-t-[28px] bg-page" style={{ maxHeight: Math.min(room, height * 0.9) }} testID="sheet-card">
          <View className="items-center pt-2.5">
            <View className="h-1.5 w-10 rounded-full bg-edge" />
          </View>
          <View className="flex-row items-start gap-3 px-5 pb-2 pt-3">
            <View className="flex-1 gap-1">
              <Text className="text-xl font-bold text-navy">{title}</Text>
              {sub ? <Text className="text-sm text-muted">{sub}</Text> : null}
            </View>
            <Pressable accessibilityLabel={t('common.close')} onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-mist active:opacity-70">
              <Icon name={icons.close} size={14} color={colors.muted} />
            </Pressable>
          </View>
          <RevealContext.Provider value={reveal}>
            <ScrollView
              ref={scrollRef}
              onScroll={onScroll}
              scrollEventThrottle={SCROLL_THROTTLE}
              style={{ flexGrow: 0 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
              {children}
            </ScrollView>
          </RevealContext.Provider>
          {footer ? (
            <View className="gap-2 border-t border-line px-5 pt-3" style={{ paddingBottom: keyboard ? 12 : Math.max(insets.bottom, 16) }}>
              {footer}
            </View>
          ) : (
            <View style={{ height: keyboard ? 8 : Math.max(insets.bottom, 16) }} />
          )}
        </View>
      </View>
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
