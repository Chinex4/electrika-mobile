import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FLOATING_BAR_HEIGHT } from '@/navigation/FloatingTabBar';
import { HAS_LIQUID_GLASS } from '@/navigation/glass';

import { brandColors, Icon, icons, type IconName } from './Icon';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/**
 * A screen. Tab screens (tabbed) sit under the status bar and leave room for
 * the floating tab bar; pushed screens sit under their native header.
 */
export function Screen({
  children,
  scroll = true,
  tabbed = false,
  refreshing,
  onRefresh,
  footer,
  className,
}: {
  children: ReactNode;
  scroll?: boolean;
  tabbed?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned to the bottom, e.g. the main action of a form. */
  footer?: ReactNode;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  const bottom = tabbed && !HAS_LIQUID_GLASS ? FLOATING_BAR_HEIGHT + Math.max(insets.bottom, 12) + 24 : footer ? 16 : insets.bottom + 32;
  const body = (
    <View className={cx('flex-1 gap-3 px-4 pt-2', className)} style={{ paddingBottom: bottom }}>
      {children}
    </View>
  );
  return (
    <SafeAreaView className="flex-1 bg-page" edges={tabbed ? ['top'] : []}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={brandColors.brand} /> : undefined}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? (
        <View className="border-t border-line bg-white px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export function Title({ children, sub, right }: { children: ReactNode; sub?: string | null; right?: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 pb-1 pt-2">
      <View className="flex-1 gap-0.5">
        <Text className="text-[28px] font-bold tracking-tight text-navy">{children}</Text>
        {sub ? <Text className="text-sm text-muted">{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View className="mt-3 flex-row items-center justify-between">
      <Text className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</Text>
      {right}
    </View>
  );
}

export function Card({
  children,
  onPress,
  className,
  tone,
}: {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  tone?: 'alert' | 'amber' | 'leaf' | 'brand';
}) {
  const toneClass = {
    alert: 'border-alert-edge bg-[#FFF8F7]',
    amber: 'border-amber-edge bg-[#FFFBF5]',
    leaf: 'border-[#BFE3CD] bg-[#F6FBF8]',
    brand: 'border-[#C7D9F0] bg-haze',
  }[tone ?? 'brand'];
  const base = cx('gap-2 rounded-2xl border p-4', tone ? toneClass : 'border-line bg-white', className);
  if (!onPress) return <View className={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="active:scale-[0.985] active:opacity-90">
      <View className={base}>{children}</View>
    </Pressable>
  );
}

/**
 * The one hero card on a dashboard. Liquid Glass over the brand gradient on
 * iOS 26+; the brand gradient on its own everywhere else.
 */
export function HeroCard({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'alert' | 'navy' }) {
  const stops = {
    brand: ['#0A5FBE', '#003D7A'],
    alert: ['#F2414A', '#B41A20'],
    navy: ['#29466F', '#14253F'],
  }[tone] as [string, string];
  return (
    <View className="overflow-hidden rounded-3xl">
      <LinearGradient colors={stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
      {HAS_LIQUID_GLASS ? (
        <GlassView glassEffectStyle="regular" tintColor="rgba(0,61,122,0.35)" style={{ padding: 20, gap: 12, borderRadius: 24 }}>
          {children}
        </GlassView>
      ) : (
        <View className="gap-3 p-5">{children}</View>
      )}
    </View>
  );
}

export function HeroStat({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1">
      <Text className="text-xl font-bold text-white">{value}</Text>
      <Text className="text-xs text-white/80" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function HeroStats({ children }: { children: ReactNode }) {
  return <View className="flex-row gap-3 border-t border-white/25 pt-3">{children}</View>;
}

/** Rows grouped in one rounded card, like a settings list. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cx('overflow-hidden rounded-2xl border border-line bg-white', className)}>{children}</View>;
}

const ROW_TONE = {
  brand: ['bg-haze', brandColors.brand],
  alert: ['bg-alert-bg', brandColors.alertInk],
  leaf: ['bg-leaf-bg', brandColors.leafInk],
  amber: ['bg-amber-bg', brandColors.amberInk],
  grey: ['bg-mist', brandColors.muted],
} as const;

export function Row({
  title,
  sub,
  right,
  icon,
  onPress,
  tone = 'brand',
  last,
  destructive,
}: {
  title: string;
  sub?: string | null;
  right?: ReactNode;
  icon?: IconName;
  onPress?: () => void;
  tone?: keyof typeof ROW_TONE;
  last?: boolean;
  destructive?: boolean;
}) {
  const [bg, tint] = ROW_TONE[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className={cx('flex-row items-center gap-3 bg-white px-4 py-3 active:bg-mist', !last && 'border-b border-line/70')}>
      {icon ? (
        <View className={cx('h-9 w-9 items-center justify-center rounded-xl', bg)}>
          <Icon name={icon} size={18} color={tint} />
        </View>
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text className={cx('text-[15px] font-semibold', destructive ? 'text-alert-ink' : 'text-navy')} numberOfLines={2}>
          {title}
        </Text>
        {sub ? (
          <Text className="text-[13px] text-muted" numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name={icons.chevron} size={14} color={brandColors.edge} /> : null)}
    </Pressable>
  );
}

/** Label and value, side by side. */
export function KeyValue({ label, value, strong }: { label: string; value?: ReactNode; strong?: boolean }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View className="flex-row items-start justify-between gap-4 py-1">
      <Text className="text-sm text-muted">{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text className={cx('flex-1 text-right text-sm', strong ? 'font-bold text-navy' : 'font-medium text-ink')}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

export function Divider() {
  return <View className="my-1 h-px bg-line" />;
}

export function Between({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cx('flex-row items-center justify-between gap-2', className)}>{children}</View>;
}

export function Heading({ children, className, lines }: { children: ReactNode; className?: string; lines?: number }) {
  return (
    <Text className={cx('text-[17px] font-semibold text-navy', className)} numberOfLines={lines}>
      {children}
    </Text>
  );
}

export function Body({ children, className, lines }: { children: ReactNode; className?: string; lines?: number }) {
  return (
    <Text className={cx('text-[15px] leading-[22px] text-ink', className)} numberOfLines={lines}>
      {children}
    </Text>
  );
}

export function Small({ children, className, lines }: { children: ReactNode; className?: string; lines?: number }) {
  return (
    <Text className={cx('text-[13px] text-muted', className)} numberOfLines={lines}>
      {children}
    </Text>
  );
}
