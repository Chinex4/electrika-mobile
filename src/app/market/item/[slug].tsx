/** A vendor's product on ElectriKa. Buyers message the vendor and pay them directly. */
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { remoteImage } from '@/api/client';
import { AdBanner, ListingGrid, PaymentNotice, share, StoreLogo, useMarketConfig, VerifiedLine } from '@/components/market';
import {
  Body, Button, Card, Choices, Failed, Field, IconButton, icons, KeyValue, ListGroup, Loading, Pill, Screen, SectionLabel, Sheet,
} from '@/components/ui';
import { useT } from '@/i18n';
import { naira } from '@/lib/format';
import { call, whatsapp } from '@/lib/pay';
import { useAction, useResource } from '@/store/hooks';
import type { Conversation, ListingDetail } from '@/types/market';

export default function ListingScreen() {
  const t = useT();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const q = useResource<ListingDetail>(`/market/listings/${slug}/`);
  const { run, busy } = useAction();
  const config = useMarketConfig();
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState(t('mk.firstMessage'));
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const item = q.data;

  const ask = async () => {
    if (!item) return;
    if (item.conversation_id) return router.push(`/market/messages/${item.conversation_id}` as Href);
    const conv = await run<Conversation>('/market/conversations/', { body: { listing: item.slug, text }, success: false, invalidate: ['/market/'] });
    setAsking(false);
    router.push(`/market/messages/${conv.id}` as Href);
  };

  return (
    <Screen
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      footer={
        item && !item.is_mine ? (
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button title={item.conversation_id ? t('mk.continueChat') : t('mk.messageVendor')} icon={icons.send} onPress={() => (item.conversation_id ? ask() : setAsking(true))} />
            </View>
            <IconButton
              icon={item.favourite ? { sf: 'heart.fill', md: 'favorite' } : { sf: 'heart', md: 'favorite_border' }}
              label={item.favourite ? t('mk.savedYes') : t('mk.save')}
              variant="surface"
              onPress={() => run(`/market/listings/${item.slug}/favourite/`, { success: false, invalidate: [`/market/listings/${item.slug}/`, '/market/home/'] })}
            />
          </View>
        ) : item?.is_mine ? (
          <Button title={t('mk.edit')} icon={icons.edit} variant="secondary" onPress={() => router.push(`/market/vendor/listing/${item.id}` as Href)} />
        ) : null
      }>
      <Stack.Screen
        options={{
          title: item?.category.name ?? '',
          headerRight: item ? () => <IconButton icon={{ sf: 'square.and.arrow.up', md: 'share' }} label={t('mk.share')} variant="surface" onPress={() => share(item.title, item.url, t)} /> : undefined,
        }}
      />
      {q.isLoading ? <Loading hero /> : null}
      {q.error && !item ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {item ? (
        <>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {(item.images.length ? item.images : [{ id: 0, url: '' }]).map((img) => (
              <View key={img.id} className="aspect-[4/3] overflow-hidden rounded-3xl bg-white" style={{ width: width - 32 }}>
                {img.url ? <Image source={remoteImage(img.url)} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} accessibilityLabel={item.title} /> : null}
              </View>
            ))}
          </ScrollView>
          <View className="gap-1.5">
            <Pill label={item.sold_by} tone="grey" />
            <Text className="text-[22px] font-bold text-navy">{item.title}</Text>
            <View className="flex-row flex-wrap items-baseline gap-x-2">
              <Text className="text-[24px] font-bold text-accent">{naira(item.price)}</Text>
              <Text className="text-[13px] text-muted">{item.negotiable ? t('mk.negotiable') : t('mk.fixed')}</Text>
            </View>
            <Text className="text-[13px] text-muted">
              {item.condition_label} · {item.city}, {item.state} · {item.available ? t('mk.available', { n: item.stock }) : t('mk.unavailable')}
            </Text>
          </View>
          {!item.is_mine && (item.vendor.whatsapp_link || item.vendor.phone) ? (
            <View className="flex-row gap-2">
              {item.vendor.whatsapp ? <View className="flex-1"><Button title={t('mk.whatsapp')} variant="secondary" size="sm" onPress={() => whatsapp(item.vendor.whatsapp)} /></View> : null}
              {item.vendor.phone ? <View className="flex-1"><Button title={t('mk.call')} variant="secondary" size="sm" icon={icons.phone} onPress={() => call(item.vendor.phone)} /></View> : null}
            </View>
          ) : null}
          <PaymentNotice text={item.payment_notice} />
          <SectionLabel>{t('mk.about')}</SectionLabel>
          <Body>{item.description}</Body>
          <SectionLabel>{t('mk.details')}</SectionLabel>
          <Card>
            <KeyValue label={t('mk.brand')} value={item.brand} />
            <KeyValue label={t('mk.manufacturer')} value={item.manufacturer} />
            <KeyValue label={t('mk.model')} value={item.model_number} />
            {item.specs.map((s) => <KeyValue key={s.label} label={s.label} value={s.value} />)}
            <KeyValue label={t('mk.warranty')} value={item.warranty} />
            <KeyValue label={t('mk.category')} value={item.category.name} />
          </Card>
          <ListGroup>
            <Pressable accessibilityRole="button" onPress={() => router.push(`/store/${item.vendor.slug}` as Href)} className="flex-row items-center gap-3 px-4 py-3 active:bg-mist">
              <StoreLogo vendor={item.vendor} />
              <View className="flex-1 gap-0.5">
                <Text className="text-[15px] font-semibold text-navy" numberOfLines={1}>
                  {item.vendor.name}
                </Text>
                <VerifiedLine vendor={item.vendor} />
              </View>
              <Text className="text-[13px] font-semibold text-accent">{t('mk.visitStore')}</Text>
            </Pressable>
          </ListGroup>
          {item.vendor.verified ? <Text className="text-[12px] text-muted">{t('mk.verifiedNote')}</Text> : null}
          {item.ads.map((ad) => <AdBanner key={ad.id} ad={ad} />)}
          {item.safety_tips.length ? (
            <Card tone="amber">
              <Text className="text-[14px] font-semibold text-navy">{t('mk.safety')}</Text>
              {item.safety_tips.map((tip) => <Text key={tip} className="text-[13px] text-ink">• {tip}</Text>)}
            </Card>
          ) : null}
          {item.more_from_vendor.length ? (
            <>
              <SectionLabel>{t('mk.moreFrom', { name: item.vendor.name })}</SectionLabel>
              <ListingGrid items={item.more_from_vendor} />
            </>
          ) : null}
          {item.similar.length ? (
            <>
              <SectionLabel>{t('mk.similar')}</SectionLabel>
              <ListingGrid items={item.similar} />
            </>
          ) : null}
          {!item.is_mine ? <Button title={t('mk.report')} variant="ghost" size="sm" onPress={() => setReporting(true)} /> : null}
        </>
      ) : null}

      <Sheet open={asking} onClose={() => setAsking(false)} title={t('mk.messageVendor')} sub={item?.vendor.name}
        footer={<Button title={t('mk.send')} icon={icons.send} busy={busy} disabled={!text.trim()} onPress={ask} />}>
        <Field label={t('mk.write')} multiline value={text} onChangeText={setText} maxLength={2000} />
      </Sheet>
      <Sheet open={reporting} onClose={() => setReporting(false)} title={t('mk.report')}
        footer={<Button title={t('mk.reportSend')} variant="danger" busy={busy} disabled={!reason}
          onPress={async () => {
            await run(`/market/listings/${slug}/report/`, { body: { reason, details } });
            setReporting(false);
          }} />}>
        <Choices label={t('mk.reportWhy')} options={(config?.listing_report_reasons ?? []).map((r) => ({ key: r.value, label: r.label }))} value={reason} onChange={setReason} />
        <Field label={t('mk.reportDetails')} multiline value={details} onChangeText={setDetails} />
      </Sheet>
    </Screen>
  );
}
