import { View } from 'react-native';

import { Body, Card, Heading } from '@/components/ui';

/** Numbered "stay safe until we arrive" steps. */
export function StaySafe({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <>
      {steps.map((s, i) => (
        <Card key={s.title}>
          <View className="flex-row gap-3">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-alert-bg">
              <Heading className="text-sm text-alert-ink">{i + 1}</Heading>
            </View>
            <View className="flex-1 gap-1">
              <Heading className="text-[16px]">{s.title}</Heading>
              <Body>{s.text}</Body>
            </View>
          </View>
        </Card>
      ))}
    </>
  );
}
