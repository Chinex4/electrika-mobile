/**
 * Bottom tabs for every dashboard.
 *
 * - iOS 26+ with Liquid Glass: the system tab bar via NativeTabs. iOS draws
 *   it in Liquid Glass, with the native minimise-on-scroll behaviour.
 * - Older iPhones and Android: ElectriKa's own floating bar (FloatingTabBar),
 *   frosted on iOS, a soft raised card on Android.
 *
 * Each role passes its own tab list; the screens are the same either way.
 */
import { Tabs } from 'expo-router/js-tabs';
import { NativeTabs } from 'expo-router/native-tabs';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { useT } from '@/i18n';
import { colors } from '@/theme/tokens';

import { FloatingTabBar } from './FloatingTabBar';
import { HAS_LIQUID_GLASS } from './glass';

export type TabSpec = {
  /** The route file in this group, e.g. "index" or "account". */
  name: string;
  /** i18n key for the label. */
  label: string;
  sf: SFSymbol;
  sfSelected?: SFSymbol;
  /** Material Symbols name for Android. */
  md: AndroidSymbol;
  badge?: number;
};

export function RoleTabs({ tabs }: { tabs: TabSpec[] }) {
  const t = useT();

  if (HAS_LIQUID_GLASS) {
    return (
      <NativeTabs tintColor={colors.brand} minimizeBehavior="onScrollDown">
        {tabs.map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name}>
            <NativeTabs.Trigger.Label>{t(tab.label)}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: tab.sf, selected: tab.sfSelected ?? tab.sf }} md={tab.md} />
            {tab.badge ? <NativeTabs.Trigger.Badge>{String(tab.badge)}</NativeTabs.Trigger.Badge> : null}
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} tabs={tabs} />}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.label) }} />
      ))}
    </Tabs>
  );
}
