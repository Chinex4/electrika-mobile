/**
 * ElectriKa's own tab bar, for phones without iOS Liquid Glass: a floating
 * rounded bar above the home indicator. Frosted (blur) on iOS, a soft raised
 * white card on Android. The active tab sits on a brand-tinted pill that
 * slides between tabs, with a light haptic tap.
 */
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { colors, radius } from '@/theme/tokens';

import type { TabSpec } from './RoleTabs';

export const FLOATING_BAR_HEIGHT = 68;

export function FloatingTabBar({ state, emitter, navigateToTab, tabs }: BottomTabBarProps & { tabs: TabSpec[] }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const slot = count ? width / count : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(state.index * slot, { damping: 18, stiffness: 180, mass: 0.6 });
  }, [state.index, slot, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: slot }));

  const body = (
    <View style={styles.row} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {slot > 0 ? (
        <Animated.View style={[styles.pillTrack, pill]} pointerEvents="none">
          <View style={styles.pill} />
        </Animated.View>
      ) : null}
      {state.routes.map((route, index) => {
        const spec = tabs.find((tab) => tab.name === route.name);
        if (!spec) return null;
        const focused = state.index === index;
        const tint = focused ? colors.brand : colors.muted;
        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            if (Platform.OS === 'ios') Haptics.selectionAsync();
            navigateToTab(route.key);
          }
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(spec.label)}
            onPress={onPress}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tab}>
            <View>
              <SymbolView
                name={{ ios: focused ? (spec.sfSelected ?? spec.sf) : spec.sf, android: spec.md }}
                size={23}
                tintColor={tint}
                type="monochrome"
              />
              {spec.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{spec.badge > 9 ? '9+' : spec.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={[styles.label, { color: tint, fontWeight: focused ? '700' : '500' }]}>
              {t(spec.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.shadow}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={85} tint="systemChromeMaterialLight" style={styles.bar}>
            {body}
          </BlurView>
        ) : (
          <View style={[styles.bar, styles.solid]}>{body}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  shadow: {
    borderRadius: radius.lg + 8,
    shadowColor: colors.navy,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bar: {
    height: FLOATING_BAR_HEIGHT,
    borderRadius: radius.lg + 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(29,53,87,0.10)',
  },
  solid: { backgroundColor: 'rgba(255,255,255,0.98)' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  pillTrack: { position: 'absolute', top: 7, bottom: 7, left: 6, alignItems: 'center' },
  pill: { flex: 1, alignSelf: 'stretch', marginHorizontal: 4, borderRadius: radius.lg, backgroundColor: 'rgba(0,81,162,0.10)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%' },
  label: { fontSize: 11 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.alert,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
});
