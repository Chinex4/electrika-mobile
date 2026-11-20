/**
 * The ElectriKa mark, drawn from the same paths as the website's
 * static/img/electrika-mark.svg: an open circle with a bar through it.
 */
import { Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { brandColors } from '@/components/ui/Icon';

export const MARK_VIEWBOX = '12 12 106 96';
export const MARK_ARC = 'M89.5 39.4 A36 36 0 1 0 89.5 80.6';
export const MARK_BAR = { x1: 40, y1: 60, x2: 106, y2: 60 };

export function LogoMark({
  size = 40,
  arc = brandColors.brand,
  bar = brandColors.alert,
}: {
  size?: number;
  arc?: string;
  bar?: string;
}) {
  return (
    <Svg width={size} height={(size * 96) / 106} viewBox={MARK_VIEWBOX} accessibilityLabel="ElectriKa">
      <Path d={MARK_ARC} fill="none" stroke={arc} strokeWidth={15} strokeLinecap="round" />
      <Line {...MARK_BAR} stroke={bar} strokeWidth={15} strokeLinecap="round" />
    </Svg>
  );
}

/** The app icon as a tile: white square, blue arc, red bar. */
export function LogoTile({ size = 56 }: { size?: number }) {
  return (
    <View
      className="items-center justify-center bg-white"
      style={{ width: size, height: size, borderRadius: size * 0.27 }}
      accessibilityRole="image"
      accessibilityLabel="ElectriKa">
      <LogoMark size={size * 0.66} />
    </View>
  );
}

/** "ElectriKa", with "Ka" picked out as on the website. */
export function Wordmark({ size = 28, light = false }: { size?: number; light?: boolean }) {
  return (
    <Text style={{ fontSize: size, lineHeight: size * 1.15 }} className={light ? 'font-bold tracking-tight text-white' : 'font-bold tracking-tight text-navy'}>
      Electri<Text style={{ color: light ? '#FF8A8E' : brandColors.alert }}>Ka</Text>
    </Text>
  );
}
