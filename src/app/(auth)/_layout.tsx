import { Redirect, Stack } from 'expo-router';

import { brandColors } from '@/components/ui';
import { useAppSelector } from '@/store/hooks';
import { selectSessionStatus } from '@/store/selectors';

export default function AuthLayout() {
  const status = useAppSelector(selectSessionStatus);
  if (status === 'signed-in') return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: brandColors.page },
        headerTintColor: brandColors.brand,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: brandColors.page },
      }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
