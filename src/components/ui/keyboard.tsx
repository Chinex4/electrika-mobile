/**
 * Keeping forms usable with the keyboard up, on iOS and Android, in screens
 * and in sheets.
 *
 * - useKeyboardInset: how much of the screen the keyboard covers, so a view
 *   can pad itself and its footer (the submit button) rides above the
 *   keyboard. React Native's KeyboardAvoidingView measures from its parent,
 *   so under a navigation header (or in a modal) it came up short and left
 *   fields hidden.
 * - RevealContext: a scroll view says how to scroll a field into view; each
 *   Field asks for that when it's focused, once the keyboard has settled.
 */
import { createContext, useCallback, useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Dimensions, Keyboard, LayoutAnimation, Platform, ScrollView, View, type KeyboardEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

export type ViewRef = ComponentRef<typeof View>;
export type ScrollRef = ComponentRef<typeof ScrollView>;

type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

export function useKeyboardInset(_container?: RefObject<ViewRef | null>) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Every Screen and Sheet reaches the bottom of the display, so the part
    // the keyboard covers is the keyboard's own height. (Measuring the view
    // instead went wrong in iOS's modal sheets, whose coordinates start at
    // the sheet, not the screen: the Emergency form's button stayed hidden.)
    const show = (e: KeyboardEvent) => {
      const covered = Math.max(0, Math.min(e.endCoordinates.height, Dimensions.get('screen').height - e.endCoordinates.screenY));
      if (Platform.OS === 'ios' && e.duration) {
        LayoutAnimation.configureNext({ duration: e.duration, update: { type: LayoutAnimation.Types.keyboard } });
      }
      setInset(covered);
    };
    const hide = (e: KeyboardEvent) => {
      if (Platform.OS === 'ios' && e?.duration) {
        LayoutAnimation.configureNext({ duration: e.duration, update: { type: LayoutAnimation.Types.keyboard } });
      }
      setInset(0);
    };
    const subs =
      Platform.OS === 'ios'
        ? [Keyboard.addListener('keyboardWillChangeFrame', show), Keyboard.addListener('keyboardWillHide', hide)]
        : [Keyboard.addListener('keyboardDidShow', show), Keyboard.addListener('keyboardDidHide', hide)];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return inset;
}

/** How often a revealing ScrollView reports its position. */
export const SCROLL_THROTTLE = 32;

/** Scrolls a focused field into the visible part of a scroll view. */
export type Reveal = (field: unknown) => void;
export const RevealContext = createContext<Reveal | null>(null);

/** For a ScrollView: pass `ref`, `onScroll` and `scrollEventThrottle`; provide `reveal` through RevealContext. */
export function useRevealingScroll() {
  const ref = useRef<ScrollRef>(null);
  const y = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    y.current = e.nativeEvent.contentOffset.y;
  }, []);
  const reveal = useCallback<Reveal>((field) => {
    // After the keyboard has moved and the view has padded itself.
    setTimeout(() => {
      const scroller = ref.current as unknown as Measurable | null;
      const target = field as Measurable | null;
      if (!target || !scroller) return;
      scroller.measureInWindow((_sx, sy, _sw, sh) => {
        target.measureInWindow((_fx, fy, _fw, fh) => {
          const margin = 24;
          const below = fy + fh + margin - (sy + sh);
          const above = sy + margin / 2 - fy;
          if (below > 0) ref.current?.scrollTo({ y: y.current + below, animated: true });
          else if (above > 0) ref.current?.scrollTo({ y: Math.max(0, y.current - above), animated: true });
        });
      });
    }, Platform.OS === 'ios' ? 320 : 180);
  }, []);
  return { ref, onScroll, reveal };
}
