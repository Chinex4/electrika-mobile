import { Image } from 'expo-image';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useT } from '@/i18n';
import type { Tone } from '@/lib/format';
import type { ApiFailure } from '@/types/api';

import { Button } from './controls';
import { brandColors, Icon, icons, type IconName } from './Icon';
import { cx } from './layout';

const PILL: Record<Tone, string> = {
  brand: 'bg-haze text-brand',
  alert: 'bg-alert-bg text-alert-ink',
  leaf: 'bg-leaf-bg text-leaf-ink',
  amber: 'bg-amber-bg text-amber-ink',
  grey: 'bg-mist text-ink',
};

export function Pill({ label, tone = 'brand' }: { label: string; tone?: Tone }) {
  const [bg, fg] = PILL[tone].split(' ');
  return (
    <View className={cx('self-start rounded-full px-2.5 py-1', bg)}>
      <Text className={cx('text-xs font-bold', fg)}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, tone, onPress }: { label: string; value: string | number; tone?: 'alert' | 'leaf' | 'brand'; onPress?: () => void }) {
  const color = { alert: 'text-alert', leaf: 'text-leaf-ink', brand: 'text-brand' }[tone ?? 'brand'];
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="min-w-[30%] flex-1 gap-0.5 rounded-2xl border border-line bg-white p-3 active:opacity-80">
      <Text className={cx('text-[22px] font-bold', tone ? color : 'text-navy')} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className="text-xs text-muted" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-2">{children}</View>;
}

function Bone({ className }: { className: string }) {
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={style} className={cx('rounded-lg bg-[#E6ECF3]', className)} />;
}

/** Placeholder cards while a screen's data loads. */
export function Loading({ rows = 3, hero }: { rows?: number; hero?: boolean }) {
  return (
    <View className="gap-3" accessibilityLabel="Loading" accessibilityRole="progressbar">
      {hero ? <Bone className="h-36 rounded-3xl" /> : null}
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className="gap-2.5 rounded-2xl border border-line bg-white p-4">
          <Bone className="h-4 w-3/5" />
          <Bone className="h-3 w-4/5" />
          <Bone className="h-3 w-2/5" />
        </View>
      ))}
    </View>
  );
}

export function Spinner() {
  return (
    <View className="items-center p-8">
      <ActivityIndicator color={brandColors.brand} />
    </View>
  );
}

export function Failed({ error, onRetry }: { error: ApiFailure | string; onRetry: () => void }) {
  const t = useT();
  const message = typeof error === 'string' ? error : error.message;
  return (
    <View className="items-center gap-3 rounded-2xl border border-line bg-white p-6">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-bg">
        <Icon name={icons.warning} size={22} color={brandColors.amberInk} />
      </View>
      <Text className="text-center text-[15px] text-ink">{message}</Text>
      <Button title={t('common.tryAgain')} variant="secondary" size="sm" onPress={onRetry} />
    </View>
  );
}

export function Empty({ title, sub, icon = icons.sparkles, action }: { title: string; sub?: string; icon?: IconName; action?: ReactNode }) {
  return (
    <View className="items-center gap-2 rounded-2xl border border-dashed border-edge bg-white/60 px-6 py-8">
      <View className="mb-1 h-12 w-12 items-center justify-center rounded-full bg-haze">
        <Icon name={icon} size={22} />
      </View>
      <Text className="text-center text-[16px] font-semibold text-navy">{title}</Text>
      {sub ? <Text className="text-center text-sm text-muted">{sub}</Text> : null}
      {action ? <View className="mt-2 self-stretch">{action}</View> : null}
    </View>
  );
}

const BANNER = {
  info: ['border-[#C7D9F0] bg-haze', 'text-navy', icons.info, brandColors.brand],
  alert: ['border-alert-edge bg-alert-bg', 'text-alert-ink', icons.warning, brandColors.alertInk],
  amber: ['border-amber-edge bg-amber-bg', 'text-amber-ink', icons.clock, brandColors.amberInk],
  leaf: ['border-[#BFE3CD] bg-leaf-bg', 'text-leaf-ink', icons.check, brandColors.leafInk],
} as const;

export function Banner({ tone = 'info', title, children, icon }: { tone?: keyof typeof BANNER; title?: string; children?: ReactNode; icon?: IconName }) {
  const [box, text, defaultIcon, tint] = BANNER[tone];
  return (
    <View className={cx('flex-row gap-3 rounded-2xl border p-3.5', box)}>
      <Icon name={icon ?? defaultIcon} size={18} color={tint} />
      <View className="flex-1 gap-0.5">
        {title ? <Text className={cx('text-[15px] font-semibold', text)}>{title}</Text> : null}
        {typeof children === 'string' ? <Text className={cx('text-sm leading-5', text)}>{children}</Text> : children}
      </View>
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  return children ? <Text className="text-sm text-alert-ink">{children}</Text> : null;
}

export function Avatar({ url, initials, size = 44, tone = 'brand' }: { url?: string | null; initials?: string; size?: number; tone?: 'brand' | 'white' }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (url) return <Image source={url} style={box} contentFit="cover" transition={150} />;
  return (
    <View style={box} className={cx('items-center justify-center', tone === 'white' ? 'bg-white/25' : 'bg-haze')}>
      <Text style={{ fontSize: size * 0.38 }} className={cx('font-bold', tone === 'white' ? 'text-white' : 'text-brand')}>
        {initials || '•'}
      </Text>
    </View>
  );
}

/** Steps of a process, e.g. an order's or a request's progress. */
export function Progress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View className="gap-0">
      {steps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <View key={label} className="flex-row gap-3">
            <View className="items-center">
              <View
                className={cx(
                  'h-6 w-6 items-center justify-center rounded-full border-2',
                  done ? 'border-leaf bg-leaf' : now ? 'border-brand bg-white' : 'border-edge bg-white',
                )}>
                {done ? <Icon name={{ sf: 'checkmark', md: 'check' }} size={12} color={brandColors.white} /> : null}
                {now ? <View className="h-2.5 w-2.5 rounded-full bg-brand" /> : null}
              </View>
              {i < steps.length - 1 ? <View className={cx('w-0.5 flex-1', done ? 'bg-leaf' : 'bg-line')} style={{ minHeight: 18 }} /> : null}
            </View>
            <Text className={cx('flex-1 pb-4 text-[15px]', now ? 'font-semibold text-navy' : done ? 'text-ink' : 'text-faint')}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
