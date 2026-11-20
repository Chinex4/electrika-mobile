import { useRef, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FLOATING_BAR_HEIGHT } from '@/navigation/FloatingTabBar';
import { HAS_LIQUID_GLASS } from '@/navigation/glass';

import { brandColors, Icon, icons, type IconName } from './Icon';
import { RevealContext, useKeyboardInset, useRevealingScroll, SCROLL_THROTTLE, type ViewRef } from './keyboard';
import { useStatusBarStyle } from './statusBar';

/**
 * The small lift under a selected pill (English | Igbo, a segmented control).
 * A style, not Tailwind's shadow-sm: shadow-sm runs on CSS variables, and a
 * class that adds variables only when selected makes NativeWind "upgrade"
 * the component mid-life. In development that upgrade printed a warning by
 * walking every prop down into React's internals, where it touched the
 * router's LinkingContext and crashed ("Couldn't find a LinkingContext
 * context") on every language switch and tab change.
 */
export const raised = { shadowColor: '#1D3557', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 } as const;

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/**
 * A screen. Tab screens (tabbed) sit under the status bar and leave room for
 * the floating tab bar; pushed screens sit under their native header.
 *
 * With the keyboard up, the screen pads itself by exactly what the keyboard
 * covers, so the footer (the main action of a form) stays above it and the
 * focused field is scrolled into view.
 */
export function Screen({
  children,
  scroll = true,
  tabbed = false,
  refreshing,
  onRefresh,
  footer,
  className,
  statusBar = 'dark',
}: {
  children: ReactNode;
  scroll?: boolean;
  tabbed?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned to the bottom, e.g. the main action of a form. */
  footer?: ReactNode;
  className?: string;
  /** What's behind the status bar: 'dark' text on the light page. */
  statusBar?: 'light' | 'dark';
}) {
  useStatusBarStyle(statusBar);
  const insets = useSafeAreaInsets();
  const frame = useRef<ViewRef>(null);
  const keyboard = useKeyboardInset(frame);
  const { ref: scrollRef, onScroll, reveal } = useRevealingScroll();
  const bottom = tabbed && !HAS_LIQUID_GLASS ? FLOATING_BAR_HEIGHT + Math.max(insets.bottom, 12) + 24 : footer ? 16 : insets.bottom + 32;
  const body = (
    <View className={cx('flex-1 gap-3 px-4 pt-2', className)} style={{ paddingBottom: keyboard && !footer ? 24 : bottom }}>
      {children}
    </View>
  );
  return (
    <SafeAreaView className="flex-1 bg-page" edges={tabbed ? ['top'] : []}>
      <View ref={frame} className="flex-1" style={{ paddingBottom: keyboard }}>
        {scroll ? (
          <RevealContext.Provider value={reveal}>
            <ScrollView
              ref={scrollRef}
              onScroll={onScroll}
              scrollEventThrottle={SCROLL_THROTTLE}
              contentContainerStyle={{ flexGrow: 1 }}
              contentInsetAdjustmentBehavior="automatic"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={brandColors.brand} /> : undefined}>
              {body}
            </ScrollView>
          </RevealContext.Provider>
        ) : (
          body
        )}
        {footer ? (
          <View className="border-t border-line bg-white px-4 pt-3" style={{ paddingBottom: keyboard ? 12 : Math.max(insets.bottom, 12) }}>
            {footer}
          </View>
        ) : null}
      </View>
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
 * The one hero card on a dashboard, in ElectriKa's own flat colours (the
 * website's bg-brand / bg-navy / bg-alert). No gradient, no glass and no
 * tint over it: Liquid Glass and the old gradient both washed the blue out
 * to a greyish one, so it never matched the website.
 */
export const HERO_TONES = { brand: brandColors.brand, alert: brandColors.alert, navy: brandColors.navy } as const;

export function HeroCard({ children, tone = 'brand' }: { children: ReactNode; tone?: keyof typeof HERO_TONES }) {
  return (
    <View className="gap-3 overflow-hidden rounded-3xl p-5" style={{ backgroundColor: HERO_TONES[tone] }}>
      {children}
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
