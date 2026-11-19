import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { StaySafe } from '@/components/StaySafe';
import { Body, Failed, Loading, Screen } from '@/components/ui';
import { useResource } from '@/store/hooks';

type Guide = { title: string; intro?: string; summary: string; steps: { title: string; text: string }[]; outro?: string };

export default function GuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useResource<Guide>(`/care/guides/${slug}/`);
  const g = q.data;
  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      {q.isLoading ? <Loading /> : null}
      {q.error && !g ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {g ? (
        <>
          <Text className="text-[26px] font-bold text-navy">{g.title}</Text>
          <Body>{g.intro ?? g.summary}</Body>
          <StaySafe steps={g.steps} />
          {g.outro ? <Body>{g.outro}</Body> : null}
        </>
      ) : null}
    </Screen>
  );
}
