import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brandColors } from '@/components/ui/Icon';
import { useStatusBarStyle } from '@/components/ui/statusBar';

import { LogoTile, Wordmark } from './Logo';

/**
 * The brand band at the top of the sign-in screens: the ElectriKa logo on
 * the website's own blue. With no title it shows the wordmark.
 */
export function AuthHeader({ title, sub, compact = false }: { title?: string; sub?: string; compact?: boolean }) {
  const insets = useSafeAreaInsets();
  // Light text and icons on the blue band.
  useStatusBarStyle('light');
  return (
    <View className="overflow-hidden rounded-b-[32px]" style={{ backgroundColor: brandColors.brand }}>
      <View className={compact ? 'gap-2 px-6 pb-7' : 'gap-3 px-6 pb-8'} style={{ paddingTop: insets.top + (compact ? 12 : 28) }}>
        <LogoTile size={compact ? 44 : 56} />
        {title ? <Text className="text-[30px] font-extrabold tracking-tight text-white">{title}</Text> : <Wordmark size={32} light />}
        {sub ? <Text className="text-base leading-6 text-white/90">{sub}</Text> : null}
      </View>
    </View>
  );
}
