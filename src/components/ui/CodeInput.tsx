/**
 * A one-time code as one box per digit.
 *
 * Underneath it's a single invisible text field laid over the boxes, so
 * everything the phone does with codes keeps working: typing, pasting the
 * whole code (long-press), backspace, iOS's "From Messages" suggestion and
 * Android's SMS autofill. The boxes only draw what's in it.
 */
import { forwardRef, useContext, useImperativeHandle, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { RevealContext } from './keyboard';
import { cx } from './layout';
import { useColors } from '@/theme';

export type CodeInputRef = { focus: () => void; clear: () => void };

export const CodeInput = forwardRef<
  CodeInputRef,
  {
    value: string;
    onChange: (code: string) => void;
    /** Called once all the digits are in. */
    onComplete?: (code: string) => void;
    length?: number;
    label: string;
    error?: string;
    autoFocus?: boolean;
    disabled?: boolean;
  }
>(function CodeInput({ value, onChange, onComplete, length = 6, label, error, autoFocus, disabled }, ref) {
  const colors = useColors();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const reveal = useContext(RevealContext);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus(), clear: () => onChange('') }));

  const digits = value.replace(/\D/g, '').slice(0, length);
  const set = (raw: string) => {
    // A pasted "123 456" or "Your code is 123456" still gives the digits.
    const next = raw.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length && next !== digits) onComplete?.(next);
  };
  const active = Math.min(digits.length, length - 1);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-navy">{label}</Text>
      <Pressable onPress={() => input.current?.focus()} accessible={false}>
        <View className="flex-row justify-between gap-2">
          {Array.from({ length }, (_, i) => {
            const filled = i < digits.length;
            const current = focused && i === active;
            return (
              <View
                key={i}
                testID={`code-box-${i}`}
                className={cx(
                  'h-[58px] flex-1 items-center justify-center rounded-2xl border-[1.5px] bg-surface',
                  error ? 'border-alert' : current ? 'border-accent' : filled ? 'border-accent/50' : 'border-edge',
                )}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.navy }}>{digits[i] ?? ''}</Text>
                {current && !filled ? <View className="absolute h-7 w-[2px] rounded-full bg-brand" /> : null}
              </View>
            );
          })}
        </View>
        <TextInput
          ref={input}
          value={digits}
          onChangeText={set}
          editable={!disabled}
          autoFocus={autoFocus}
          maxLength={Platform.OS === 'web' ? undefined : length + 12}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          importantForAutofill="yes"
          caretHidden
          contextMenuHidden={false}
          selectTextOnFocus={false}
          accessibilityLabel={label}
          accessibilityHint={`${length} digits`}
          onFocus={() => {
            setFocused(true);
            reveal?.(input.current);
          }}
          onBlur={() => setFocused(false)}
          // Over the boxes and invisible, so a tap or long-press (paste) lands on it.
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent', fontSize: 1 }}
        />
      </Pressable>
      {error ? <Text className="text-sm text-alert-ink">{error}</Text> : null}
    </View>
  );
});
