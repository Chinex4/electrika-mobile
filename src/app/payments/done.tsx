import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { brandColors, Button, Icon, icons, Screen } from '@/components/ui';
import { useT } from '@/i18n';

/** Where Paystack's return link (electrika://payments/done?result=…) lands if the app was closed. */
export default function PaymentDone() {
  const t = useT();
  const { result } = useLocalSearchParams<{ result?: string }>();
  const paid = result === 'paid';
  const failed = result === 'failed';
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4 py-16">
        <View className={paid ? 'h-20 w-20 items-center justify-center rounded-full bg-leaf-bg' : 'h-20 w-20 items-center justify-center rounded-full bg-amber-bg'}>
          <Icon name={paid ? icons.check : failed ? icons.warning : icons.clock} size={36} color={paid ? brandColors.leafInk : brandColors.amberInk} />
        </View>
        <Text className="text-center text-[24px] font-bold text-navy">{paid ? t('pay.paid') : failed ? t('pay.failed') : t('pay.notYet')}</Text>
        <Button title={t('common.continue')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    </Screen>
  );
}
