/** "Become a vendor": what you get, the plans, and the sign-up form. */
import { router, Stack, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { StoreForm } from '@/components/market/StoreForm';
import { Banner, Card, Failed, Loading, Screen, SectionLabel } from '@/components/ui';
import { useSession } from '@/auth/session';
import { useT } from '@/i18n';
import { naira } from '@/lib/format';
import { useResource } from '@/store/hooks';
import type { MyStore, Plan } from '@/types/market';

export default function Sell() {
  const t = useT();
  const { user } = useSession();
  const mine = useResource<{ store: MyStore | null; can_open_store: boolean }>('/market/vendor/');
  const plans = useResource<{ results: Plan[] }>('/market/plans/', { auth: false });
  useEffect(() => {
    if (mine.data?.store) router.replace('/market/vendor' as Href);
  }, [mine.data?.store]);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('mk.sellTitle') }} />
      <View className="gap-2 rounded-3xl bg-navy-fill p-5">
        <Text className="text-[20px] font-bold text-white">{t('mk.sellHero')}</Text>
        {t('mk.sellPoints').split('\n').map((line) => (
          <Text key={line} className="text-[13.5px] text-white/90">✓ {line}</Text>
        ))}
      </View>
      <SectionLabel>{t('mk.plans')}</SectionLabel>
      {plans.isLoading ? <Loading rows={2} /> : null}
      {plans.data?.results.map((p) => (
        <Card key={p.id}>
          <View className="flex-row items-baseline justify-between">
            <Text className="text-[16px] font-bold text-navy">{p.name}</Text>
            <Text className="text-[15px] font-bold text-accent">{p.is_free ? t('mk.free') : `${naira(p.monthly_price)}${t('mk.perMonth')}`}</Text>
          </View>
          {p.tagline ? <Text className="text-[13px] text-muted">{p.tagline}</Text> : null}
          {!p.is_free && Number(p.annual_price) ? <Text className="text-[12px] text-muted">{t('mk.orYear', { price: naira(p.annual_price) })}</Text> : null}
          {p.features.map((f) => <Text key={f} className="text-[13px] text-ink">• {f}</Text>)}
        </Card>
      ))}
      <Text className="text-[12.5px] text-muted">{t('mk.startsFree')}</Text>
      {mine.error && !mine.data ? <Failed error={mine.error} onRetry={mine.refetch} /> : null}
      {mine.data && !mine.data.can_open_store ? <Banner tone="amber">{t('mk.staffAccount')}</Banner> : null}
      {mine.data?.can_open_store && !mine.data.store ? (
        <>
          <SectionLabel>{t('mk.yourBusiness')}</SectionLabel>
          <StoreForm submitLabel={t('mk.openStore')} defaults={{ phone: user?.phone_number ?? '', email: user?.email ?? '' }}
            onSaved={() => router.replace('/market/vendor' as Href)} />
          <Text className="text-[12px] text-muted">{t('mk.sellRules')}</Text>
        </>
      ) : null}
    </Screen>
  );
}
