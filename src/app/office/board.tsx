import { Stack } from 'expo-router';

import { useT } from '@/i18n';
import { BoardScreen } from '@/screens/staff/Office';

export default function Page() {
  const t = useT();
  return (
    <>
      <Stack.Screen options={{ title: t('tab.board') }} />
      <BoardScreen tabbed={false} />
    </>
  );
}
