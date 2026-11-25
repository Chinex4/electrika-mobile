/** Buy and follow product promotions. Always labelled Sponsored where they show. */
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { payWith } from '@/components/market';
import { VendorTabs } from '@/components/market/VendorTabs';
import { Banner, Button, Card, Choices, Failed, Loading, OptionCards, Pill, Screen, SectionLabel, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { day, naira } from '@/lib/format';
import { useAction, useResource } from '@/store/hooks';
import type { Checkout, MyListing, Paged } from '@/types/market';

type Promo = {
  id: number; kind_label: string; package: string; listing: { id: number; title: string }; amount: string; status: string; status_label: string;
  starts_at: string | null; ends_at: string | null; note: string; impressions: number; clicks: number; ctr: number; payment_id: number | null;
};
type Page = { can_promote: boolean; packages: { id: number; name: string; kind_label: string; price: string; days: number; needs_approval: boolean }[]; results: Promo[] };

export default function Promotions() {
  const t = useT();
  const params = useLocalSearchParams<{ listing?: string }>();
  const q = useResource<Page>('/market/vendor/promotions/');
  const live = useResource<Paged<MyListing>>('/market/vendor/listings/?status=PUBLISHED');
  const { run, busy } = useAction();
  const [listing, setListing] = useState(params.listing ?? '');
  const [pkg, setPkg] = useState('');

  const buy = async () => {
    const res = await run<Checkout>('/market/vendor/promotions/', { body: { listing, package: pkg }, success: false, invalidate: ['/market/vendor/'] });
    await payWith(res.checkout_url, t);
    q.refetch();
  };
  const pay = async (id: number) => {
    const res = await run<Checkout>(`/market/vendor/payments/${id}/pay/`, { success: false });
    await payWith(res.checkout_url, t);
    q.refetch();
  };

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Stack.Screen options={{ title: '' }} />
      <Title>{t('mk.promotions')}</Title>
      <VendorTabs here="promotions" />
      <Text className="text-[12.5px] text-muted">{t('mk.promoNote')}</Text>
      {q.isLoading ? <Loading rows={3} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data && !q.data.can_promote ? <Banner tone="amber">{t('mk.promoPlan')}</Banner> : null}
      {q.data?.can_promote && live.data && !live.data.results.length ? <Banner tone="info">{t('mk.promoNeedsListing')}</Banner> : null}
      {q.data?.can_promote && live.data?.results.length ? (
        <Card>
          <Choices label={t('mk.product')} scroll options={live.data.results.map((l) => ({ key: String(l.id), label: l.title }))} value={listing} onChange={setListing} />
          <OptionCards label={t('mk.whereHowLong')} value={pkg} onChange={setPkg}
            options={q.data.packages.map((p) => ({ key: String(p.id), label: `${p.name} · ${naira(p.price)}`, hint: `${p.kind_label}${p.needs_approval ? ` · ${t('mk.reviewedFirst')}` : ''}` }))} />
          <Button title={t('mk.toPayment')} busy={busy} disabled={!listing || !pkg} onPress={buy} />
        </Card>
      ) : null}
      <SectionLabel>{t('mk.yourPromos')}</SectionLabel>
      {q.data && !q.data.results.length ? <Text className="text-[13px] text-muted">{t('mk.noPromos')}</Text> : null}
      {q.data?.results.map((p) => (
        <Card key={p.id}>
          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-[14px] font-semibold text-navy" numberOfLines={1}>{p.listing.title}</Text>
            <Pill label={p.status_label} tone={p.status === 'ACTIVE' ? 'leaf' : p.status.startsWith('PENDING') || p.status === 'SCHEDULED' ? 'amber' : 'grey'} />
          </View>
          <Text className="text-[12.5px] text-muted">{p.package} · {naira(p.amount)}{p.starts_at ? ` · ${day(p.starts_at)} – ${day(p.ends_at)}` : ''}</Text>
          <Text className="text-[12.5px] text-ink">{t('mk.clicks', { v: String(p.impressions), c: String(p.clicks) })} · {p.ctr}%</Text>
          {p.note ? <Text className="text-[12.5px] text-amber-ink">{p.note}</Text> : null}
          {p.status === 'PENDING_PAYMENT' ? (
            <View className="flex-row gap-2">
              {p.payment_id ? <Button title={t('mk.pay')} size="sm" onPress={() => pay(p.payment_id!)} /> : null}
              <Button title={t('mk.cancel')} size="sm" variant="secondary" onPress={() => run(`/market/vendor/promotions/${p.id}/cancel/`, { success: false, invalidate: ['/market/vendor/promotions/'] })} />
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
