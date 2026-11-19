import * as Haptics from 'expo-haptics';
import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Switch, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useT } from '@/i18n';

import { brandColors, Icon, icons, type IconName } from './Icon';
import { cx } from './layout';

const tap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
};

const BUTTON = {
  primary: { box: 'bg-brand', text: 'text-white', tint: brandColors.white },
  danger: { box: 'bg-alert', text: 'text-white', tint: brandColors.white },
  success: { box: 'bg-leaf', text: 'text-white', tint: brandColors.white },
  secondary: { box: 'border-[1.5px] border-edge bg-white', text: 'text-brand', tint: brandColors.brand },
  soft: { box: 'bg-haze', text: 'text-brand', tint: brandColors.brand },
  ghost: { box: 'bg-transparent', text: 'text-brand', tint: brandColors.brand },
  light: { box: 'bg-white/20', text: 'text-white', tint: brandColors.white },
  white: { box: 'bg-white', text: 'text-brand', tint: brandColors.brand },
} as const;

export type ButtonVariant = keyof typeof BUTTON;

export function Button({
  title,
  onPress,
  busy,
  disabled,
  variant = 'primary',
  icon,
  size = 'md',
  className,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: IconName;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const v = BUTTON[variant];
  const height = { sm: 'min-h-[40px] px-4', md: 'min-h-[52px] px-5', lg: 'min-h-[58px] px-6' }[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(busy || disabled), busy: !!busy }}
      disabled={busy || disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      className={cx(
        'flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80',
        height,
        v.box,
        (busy || disabled) && 'opacity-50',
        className,
      )}>
      {busy ? (
        <ActivityIndicator color={v.tint} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 18} color={v.tint} /> : null}
          <Text className={cx('font-semibold', size === 'sm' ? 'text-sm' : 'text-base', v.text)}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  variant = 'soft',
  badge,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  variant?: 'soft' | 'white' | 'light' | 'primary';
  badge?: number;
}) {
  const v = BUTTON[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      className={cx('h-11 w-11 items-center justify-center rounded-full active:opacity-70', v.box)}>
      <Icon name={icon} size={19} color={v.tint} />
      {badge ? (
        <View className="absolute -right-1 -top-1 min-w-[20px] items-center rounded-full bg-alert px-1.5 py-0.5">
          <Text className="text-[11px] font-bold text-white">{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string; hint?: string; icon?: IconName; className?: string };

export type FieldRef = ComponentRef<typeof TextInput>;

export const Field = forwardRef<FieldRef, FieldProps>(function Field({ label, error, hint, icon, multiline, className, secureTextEntry, ...props }, ref) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  // Password fields get an eye to show what was typed.
  const [hidden, setHidden] = useState(true);
  return (
    <View className={cx('gap-1.5', className)}>
      <Text className="text-sm font-semibold text-navy">{label}</Text>
      <View
        className={cx(
          'flex-row items-center gap-2 rounded-2xl border-[1.5px] bg-white px-4',
          multiline ? 'min-h-[104px] items-start py-3' : 'min-h-[52px]',
          error ? 'border-alert' : focused ? 'border-brand' : 'border-edge',
        )}>
        {icon ? <Icon name={icon} size={17} color={brandColors.faint} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={brandColors.faint}
          multiline={multiline}
          secureTextEntry={secureTextEntry && hidden}
          accessibilityLabel={label}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className="flex-1 py-2 text-base text-navy"
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('common.showPassword') : t('common.hidePassword')}
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-mist">
            <Icon name={hidden ? { sf: 'eye', md: 'visibility' } : { sf: 'eye.slash', md: 'visibility_off' }} size={19} color={brandColors.muted} />
          </Pressable>
        ) : null}
      </View>
      {hint && !error ? <Text className="text-[13px] text-muted">{hint}</Text> : null}
      {error ? <Text className="text-sm text-alert-ink">{error}</Text> : null}
    </View>
  );
});

/** Pick one (or several) from a short list, as tappable chips. */
export function Choices<K extends string>({
  label,
  options,
  value,
  onChange,
  error,
  tone = 'brand',
  scroll,
}: {
  label?: string;
  options: { key: K; label: string; hint?: string }[];
  value: K | K[] | null | undefined;
  onChange: (key: K) => void;
  error?: string;
  tone?: 'brand' | 'alert';
  /** One scrolling line instead of wrapping. */
  scroll?: boolean;
}) {
  const chosen = (k: K) => (Array.isArray(value) ? value.includes(k) : value === k);
  const on = tone === 'alert' ? 'border-alert bg-alert-bg' : 'border-brand bg-brand';
  const onText = tone === 'alert' ? 'text-alert-ink' : 'text-white';
  const chips = options.map((o) => (
    <Pressable
      key={o.key}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen(o.key) }}
      onPress={() => {
        tap();
        onChange(o.key);
      }}
      className={cx('rounded-full border-[1.5px] px-4 py-2.5 active:opacity-80', chosen(o.key) ? on : 'border-line bg-white')}>
      <Text className={cx('text-sm font-semibold', chosen(o.key) ? onText : 'text-ink')}>{o.label}</Text>
    </Pressable>
  ));
  return (
    <View className="gap-2">
      {label ? <Text className="text-sm font-semibold text-navy">{label}</Text> : null}
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="-mx-4 px-4">
          {chips}
        </ScrollView>
      ) : (
        <View className="flex-row flex-wrap gap-2">{chips}</View>
      )}
      {error ? <Text className="text-sm text-alert-ink">{error}</Text> : null}
    </View>
  );
}

/** Choices as full-width cards, for a few options that need a line each. */
export function OptionCards<K extends string>({
  options,
  value,
  onChange,
  label,
  error,
}: {
  options: { key: K; label: string; hint?: string; icon?: IconName }[];
  value: K | null | undefined;
  onChange: (key: K) => void;
  label?: string;
  error?: string;
}) {
  return (
    <View className="gap-2">
      {label ? <Text className="text-sm font-semibold text-navy">{label}</Text> : null}
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            className={cx('flex-row items-center gap-3 rounded-2xl border-[1.5px] p-4 active:opacity-90', on ? 'border-brand bg-haze' : 'border-line bg-white')}>
            {o.icon ? <Icon name={o.icon} size={20} color={on ? brandColors.brand : brandColors.muted} /> : null}
            <View className="flex-1 gap-0.5">
              <Text className={cx('text-[15px] font-semibold', on ? 'text-brand' : 'text-navy')}>{o.label}</Text>
              {o.hint ? <Text className="text-[13px] text-muted">{o.hint}</Text> : null}
            </View>
            <View className={cx('h-5 w-5 items-center justify-center rounded-full border-2', on ? 'border-brand' : 'border-edge')}>
              {on ? <View className="h-2.5 w-2.5 rounded-full bg-brand" /> : null}
            </View>
          </Pressable>
        );
      })}
      {error ? <Text className="text-sm text-alert-ink">{error}</Text> : null}
    </View>
  );
}

export function Segmented<K extends string>({ value, onChange, options }: { value: K; onChange: (k: K) => void; options: { key: K; label: string; count?: number }[] }) {
  return (
    <View className="flex-row rounded-2xl bg-[#E8EDF4] p-1">
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === o.key }}
          onPress={() => {
            tap();
            onChange(o.key);
          }}
          className={cx('flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5', value === o.key && 'bg-white shadow-sm')}>
          <Text className={cx('text-sm font-semibold', value === o.key ? 'text-brand' : 'text-muted')}>{o.label}</Text>
          {o.count ? (
            <View className={cx('rounded-full px-1.5', value === o.key ? 'bg-haze' : 'bg-white/70')}>
              <Text className="text-[11px] font-bold text-brand">{o.count}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ label, sub, value, onChange, disabled }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold text-navy">{label}</Text>
        {sub ? <Text className="text-[13px] text-muted">{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          tap();
          onChange(v);
        }}
        trackColor={{ true: brandColors.leaf, false: brandColors.edge }}
        thumbColor={Platform.OS === 'android' ? brandColors.white : undefined}
      />
    </View>
  );
}

export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => {
        tap();
        onChange(!value);
      }}
      className="flex-row items-center gap-3 py-1.5">
      <View className={cx('h-6 w-6 items-center justify-center rounded-lg border-2', value ? 'border-leaf bg-leaf' : 'border-edge bg-white')}>
        {value ? <Icon name={{ sf: 'checkmark', md: 'check' }} size={14} color={brandColors.white} /> : null}
      </View>
      <Text className="flex-1 text-[15px] text-ink">{label}</Text>
    </Pressable>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const step = (d: number) => {
    const next = Math.max(min, Math.min(max, value + d));
    if (next !== value) {
      tap();
      onChange(next);
    }
  };
  return (
    <View className="flex-row items-center rounded-full border-[1.5px] border-line bg-white">
      <Pressable accessibilityLabel="Less" onPress={() => step(-1)} className="h-9 w-9 items-center justify-center active:opacity-60">
        <Icon name={icons.minus} size={14} color={brandColors.brand} />
      </Pressable>
      <Text className="min-w-[24px] text-center text-[15px] font-bold text-navy">{value}</Text>
      <Pressable accessibilityLabel="More" onPress={() => step(1)} className="h-9 w-9 items-center justify-center active:opacity-60">
        <Icon name={icons.plus} size={14} color={brandColors.brand} />
      </Pressable>
    </View>
  );
}

/** A big tappable tile for a dashboard's quick actions. */
export function ActionTile({ title, sub, icon, onPress, tone = 'brand' }: { title: string; sub?: string; icon: IconName; onPress: () => void; tone?: 'brand' | 'alert' | 'leaf' | 'amber' }) {
  const t = {
    brand: ['bg-haze', brandColors.brand],
    alert: ['bg-alert-bg', brandColors.alert],
    leaf: ['bg-leaf-bg', brandColors.leafInk],
    amber: ['bg-amber-bg', brandColors.amberInk],
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      className="min-w-[46%] flex-1 gap-2 rounded-2xl border border-line bg-white p-4 active:scale-[0.98] active:opacity-90">
      <View className={cx('h-10 w-10 items-center justify-center rounded-xl', t[0])}>
        <Icon name={icon} size={20} color={t[1] as string} />
      </View>
      <Text className="text-[15px] font-semibold text-navy" numberOfLines={2}>
        {title}
      </Text>
      {sub ? (
        <Text className="text-xs text-muted" numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text className="text-sm font-semibold text-navy">{children}</Text>;
}
