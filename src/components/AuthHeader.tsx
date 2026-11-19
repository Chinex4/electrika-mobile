import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brandColors, Icon, icons } from '@/components/ui';

/** The brand band at the top of the sign-in screens. */
export function AuthHeader({ title, sub }: { title: string; sub?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="overflow-hidden rounded-b-[32px]">
      <LinearGradient colors={['#0A5FBE', '#003D7A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
      <View className="gap-3 px-6 pb-8" style={{ paddingTop: insets.top + 28 }}>
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <Icon name={icons.bolt} size={28} color={brandColors.white} />
        </View>
        <Text className="text-[32px] font-extrabold tracking-tight text-white">{title}</Text>
        {sub ? <Text className="text-base leading-6 text-white/85">{sub}</Text> : null}
      </View>
    </View>
  );
}
