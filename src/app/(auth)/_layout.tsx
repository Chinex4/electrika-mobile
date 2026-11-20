import { Redirect, Stack } from 'expo-router';

import { useAppSelector } from '@/store/hooks';
import { selectSessionStatus } from '@/store/selectors';
import { useColors } from '@/theme';

export default function AuthLayout() {
  const colors = useColors();
  const status = useAppSelector(selectSessionStatus);
  if (status === 'signed-in') return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.page },
        headerTintColor: colors.brand,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.page },
      }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
