/** Book a banner advert for the store or a listing, and follow its results. */
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { photoPart, remoteImage } from '@/api/client';
import { payWith } from '@/components/market';
import { VendorTabs } from '@/components/market/VendorTabs';
import { Button, Card, Choices, Failed, Field, Loading, OptionCards, pickPhoto, Pill, Screen, SectionLabel, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { day, naira } from '@/lib/format';
import { useAction, useResource } from '@/store/hooks';
import type { Ad, Category, Checkout, MyListing, Paged } from '@/types/market';

type Campaign = Ad & { status: string; status_label: string; starts_at: string | null; ends_at: string | null; impressions: number; clicks: number;
  ctr: number; note: string; placement_label: string; payment_id: number | null };
type Page = { packages: { id: number; name: string; price: string; days: number; placement: string; placement_label: string; image_hint: string }[]; results: Campaign[] };

export default function Adverts() {
  const t = useT();
  const q = useResource<Page>('/market/vendor/adverts/');
  const live = useResource<Paged<MyListing>>('/market/vendor/listings/?status=PUBLISHED');
  const cats = useResource<{ results: Category[] }>('/market/categories/', { auth: false, refetchOnFocus: false });
  const { run, busy } = useAction();
  const [pkg, setPkg] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [listing, setListing] = useState('');
  const [category, setCategory] = useState('');
  const chosen = q.data?.packages.find((p) => String(p.id) === pkg);

  const book = async () => {
    if (!image) return;
    const form = new FormData();
    form.append('package', pkg);
    form.append('title', title);
    form.append('subtitle', subtitle);
    if (listing) form.append('listing', listing);
    if (category) form.append('category', category);
    form.append('image', photoPart(image, 'banner.jpg'));
    const res = await run<Checkout>('/market/vendor/adverts/', { body: form, success: false });
    await payWith(res.checkout_url, t);
    setTitle('');
    setSubtitle('');
    setImage(null);
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
      <Title>{t('mk.adverts')}</Title>
      <VendorTabs here="adverts" />
      <Text className="text-[12.5px] text-muted">{t('mk.adNote')}</Text>
      {q.isLoading ? <Loading rows={3} /> : null}
      {q.error && !q.data ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {q.data?.packages.length ? (
        <Card>
          <Text className="text-[15px] font-semibold text-navy">{t('mk.bookAd')}</Text>
          <OptionCards label={t('mk.where')} value={pkg} onChange={setPkg}
            options={q.data.packages.map((p) => ({ key: String(p.id), label: `${p.placement_label} · ${p.name}`, hint: `${naira(p.price)} · ${p.image_hint}` }))} />
          <Field label={t('mk.headline')} value={title} onChangeText={setTitle} maxLength={80} />
          <Field label={t('mk.subline')} value={subtitle} onChangeText={setSubtitle} maxLength={140} />
          <Text className="text-sm font-semibold text-navy">{t('mk.banner')}</Text>
          {image ? <Image source={image} style={{ width: '100%', aspectRatio: 4, borderRadius: 12 }} contentFit="cover" /> : null}
          <Button title={image ? t('mk.change') : t('mk.choose')} size="sm" variant="secondary" onPress={async () => { const u = await pickPhoto('library'); if (u) setImage(u); }} />
          <Choices label={t('mk.tapOpens')} scroll value={listing} onChange={setListing}
            options={[{ key: '', label: t('mk.myStorefront') }, ...(live.data?.results ?? []).map((l) => ({ key: String(l.id), label: l.title }))]} />
          {chosen?.placement === 'CATEGORY' ? (
            <Choices label={t('mk.category')} scroll value={category} onChange={setCategory} options={(cats.data?.results ?? []).map((c) => ({ key: String(c.id), label: c.name }))} />
          ) : null}
          <Button title={t('mk.toPayment')} busy={busy} disabled={!pkg || title.trim().length < 3 || !image} onPress={book} />
        </Card>
      ) : null}
      <SectionLabel>{t('mk.yourAds')}</SectionLabel>
      {q.data && !q.data.results.length ? <Text className="text-[13px] text-muted">{t('mk.noAds')}</Text> : null}
      {q.data?.results.map((c) => (
        <Card key={c.id}>
          <Image source={remoteImage(c.image_url)} style={{ width: '100%', aspectRatio: 4, borderRadius: 10 }} contentFit="cover" />
          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-[14px] font-semibold text-navy" numberOfLines={1}>{c.title}</Text>
            <Pill label={c.status_label} tone={c.status === 'ACTIVE' ? 'leaf' : c.status.startsWith('PENDING') || c.status === 'SCHEDULED' ? 'amber' : 'grey'} />
          </View>
          <Text className="text-[12.5px] text-muted">{c.placement_label}{c.starts_at ? ` · ${day(c.starts_at)} – ${day(c.ends_at)}` : ''}</Text>
          <Text className="text-[12.5px] text-ink">{t('mk.clicks', { v: String(c.impressions), c: String(c.clicks) })} · {c.ctr}%</Text>
          {c.note ? <Text className="text-[12.5px] text-amber-ink">{c.note}</Text> : null}
          {c.status === 'PENDING_PAYMENT' && c.payment_id ? <Button title={t('mk.pay')} size="sm" onPress={() => pay(c.payment_id!)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
