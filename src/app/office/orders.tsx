import { Stack } from 'expo-router';

import { useT } from '@/i18n';
import { OrdersScreen } from '@/screens/staff/Office';

export default function Page() {
  const t = useT();
  return (
    <>
      <Stack.Screen options={{ title: t('tab.orders') }} />
      <OrdersScreen tabbed={false} />
    </>
  );
}
