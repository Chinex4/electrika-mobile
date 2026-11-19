import { Stack } from 'expo-router';

import { useT } from '@/i18n';
import { RequestsScreen } from '@/screens/staff/Office';

export default function Page() {
  const t = useT();
  return (
    <>
      <Stack.Screen options={{ title: t('office.newRequests') }} />
      <RequestsScreen tabbed={false} />
    </>
  );
}
