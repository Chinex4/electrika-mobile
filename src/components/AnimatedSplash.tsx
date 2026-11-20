/**
 * The launch animation, the same as the installed website's
 * (templates/pwa/_splash.html in the Django project): ElectriKa blue fills
 * the screen, the mark pops in and draws itself, "ElectriKa" and "TOTAL
 * CARE PLAN" rise in, then the blue closes into the middle to show the app.
 *
 * The phone's own splash (app.json, expo-splash-screen) is the same blue
 * with the same mark, so the two run together: this one is drawn over it,
 * then the native one is hidden.
 */
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import { MARK_ARC, MARK_BAR, MARK_VIEWBOX } from './Logo';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const BLUE = '#0051A2';
const CORAL = '#FF5A5F';
const ARC_LENGTH = 190;
const BAR_LENGTH = 70;
/** Long enough for the mark to finish drawing (the website waits 1.5 s too). */
export const MIN_SHOW_MS = 1500;
const OPEN_MS = 600;

const pop = Easing.bezier(0.2, 0.9, 0.3, 1.25);
const draw = Easing.bezier(0.6, 0, 0.2, 1);
const close = Easing.bezier(0.7, 0, 0.3, 1);

export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const diameter = Math.hypot(width, height) * 1.05;
  const shownAt = useRef(0);
  const [reduced, setReduced] = useState(false);
  const [opening, setOpening] = useState(false);

  const mark = useSharedValue(0);
  const arc = useSharedValue(ARC_LENGTH);
  const bar = useSharedValue(BAR_LENGTH);
  const word = useSharedValue(0);
  const tag = useSharedValue(0);
  const away = useSharedValue(0);
  const circle = useSharedValue(1);

  useEffect(() => {
    shownAt.current = Date.now();
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
  }, []);

  // The overlay is on screen in the same blue, so the phone's own splash can go.
  const onLayout = () => {
    SplashScreen.hideAsync().catch(() => undefined);
    mark.value = withTiming(1, { duration: 600, easing: pop });
    arc.value = withDelay(150, withTiming(0, { duration: 700, easing: draw }));
    bar.value = withDelay(600, withTiming(0, { duration: 450, easing: draw }));
    word.value = withDelay(750, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
    tag.value = withDelay(900, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
  };

  useEffect(() => {
    if (!ready || opening) return;
    const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - shownAt.current));
    const id = setTimeout(() => {
      setOpening(true);
      away.value = withTiming(1, { duration: 350, easing: Easing.in(Easing.quad) });
      circle.value = withTiming(0, { duration: reduced ? 300 : OPEN_MS, easing: close });
    }, wait);
    return () => clearTimeout(id);
  }, [ready, opening, reduced, away, circle]);

  useEffect(() => {
    if (!opening) return;
    const id = setTimeout(onDone, (reduced ? 300 : OPEN_MS) + 50);
    return () => clearTimeout(id);
  }, [opening, reduced, onDone]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : mark.value,
    transform: [{ scale: reduced ? 1 : 0.55 + 0.45 * mark.value }],
  }));
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: reduced ? 0 : arc.value }));
  const barProps = useAnimatedProps(() => ({ strokeDashoffset: reduced ? 0 : bar.value }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : word.value,
    transform: [{ translateY: reduced ? 0 : 8 * (1 - word.value) }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : tag.value,
    transform: [{ translateY: reduced ? 0 : 8 * (1 - tag.value) }],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    opacity: 1 - away.value,
    transform: [{ scale: 1 + 0.12 * away.value }],
  }));
  // The website closes a clip-path circle; here the blue is a circle that shrinks.
  const circleStyle = useAnimatedStyle(() =>
    reduced ? { opacity: circle.value } : { transform: [{ scale: circle.value }] },
  );

  return (
    <View pointerEvents={opening ? 'none' : 'auto'} style={StyleSheet.absoluteFill} onLayout={onLayout} testID="animated-splash">
      {/* Light on the blue while it shows; each screen sets its own after. */}
      <StatusBar style="light" />
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Animated.View
          style={[
            { width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: BLUE, position: 'absolute' },
            circleStyle,
          ]}
        />
        <Animated.View style={[styles.center, { gap: 14 }, innerStyle]} accessible accessibilityLabel="ElectriKa">
          <Animated.View style={markStyle}>
            <Svg width={96} height={87} viewBox={MARK_VIEWBOX}>
              <AnimatedPath
                d={MARK_ARC}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={15}
                strokeLinecap="round"
                strokeDasharray={ARC_LENGTH}
                animatedProps={arcProps}
              />
              <AnimatedLine {...MARK_BAR} stroke={CORAL} strokeWidth={15} strokeLinecap="round" strokeDasharray={BAR_LENGTH} animatedProps={barProps} />
            </Svg>
          </Animated.View>
          <Animated.View style={wordStyle}>
            <Text style={styles.word}>
              Electri<Text style={{ color: '#FF8A8E' }}>Ka</Text>
            </Text>
          </Animated.View>
          <Animated.View style={tagStyle}>
            <Text style={styles.tag}>TOTAL CARE PLAN</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  tag: { fontSize: 10, fontWeight: '600', letterSpacing: 3, color: 'rgba(255,255,255,0.75)' },
});
