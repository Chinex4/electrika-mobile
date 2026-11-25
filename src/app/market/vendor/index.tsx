/** The vendor dashboard: store link, numbers, plan, and the latest messages. */
import * as Clipboard from 'expo-clipboard';
import { router, Stack, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { share } from '@/components/market';
import { VendorTabs } from '@/components/market/VendorTabs';
import { Banner, Button, Card, Failed, icons, ListGroup, Loading, Pill, Row, Screen, SectionLabel, Stat, StatGrid, Title } from '@/components/ui';
import { useT } from '@/i18n';
import { day } from '@/lib/format';
import { notify } from '@/lib/toast';
import { useResource } from '@/store/hooks';
import type { Conversation, Dashboard, Paged } from '@/types/market';

export default function VendorHome() {
  const t = useT();
  const q = useResource<Dashboard>('/market/vendor/dashboard/');
  const chats = useResource<Paged<Conversation>>('/market/conversations/?as=vendor');
  const d = q.data;
  const s = d?.store;
  useEffect(() => {
    if (q.error?.status === 403) router.replace('/market/sell' as Href);
  }, [q.error]);

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => { q.refetch(); chats.refetch(); }}>
      <Stack.Screen options={{ title: '' }} />
      <Title sub={t('mk.dashboard')}>{s?.name ?? t('mk.myStore')}</Title>
      <VendorTabs here="dash" />
      {q.isLoading ? <Loading hero /> : null}
      {q.error && !d && q.error.status !== 403 ? <Failed error={q.error} onRetry={q.refetch} /> : null}
      {d && s ? (
        <>
          {s.status === 'SUSPENDED' ? <Banner tone="alert" title={t('mk.suspendedStore')}>{s.status_note}</Banner> : null}
          {s.status === 'REJECTED' ? <Banner tone="amber" title={t('mk.notVerified')}>{s.status_note}</Banner> : null}
          {s.status === 'PENDING' ? <Banner tone="info">{t('mk.reviewing')}</Banner> : null}
          <Card>
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted">{t('mk.storeLink')}</Text>
            <Text selectable className="text-[14px] font-semibold text-navy">{s.storefront_url}</Text>
            <View className="flex-row gap-2">
              <View className="flex-1"><Button title={t('mk.copy')} size="sm" variant="secondary"
                onPress={async () => { await Clipboard.setStringAsync(s.storefront_url); notify.success(t('mk.copied')); }} /></View>
              <View className="flex-1"><Button title={t('mk.share')} size="sm" onPress={() => share(s.name, s.storefront_url, t)} /></View>
            </View>
            <Pressable onPress={() => router.push(`/store/${s.slug}` as Href)}>
              <Text className="text-[13px] font-semibold text-accent">{t('mk.preview')} →</Text>
            </Pressable>
          </Card>
          <StatGrid>
            <Stat label={`${t('mk.liveListings')}${d.listing_limit ? ` ${t('mk.of', { n: d.listing_limit })}` : ''}`} value={d.listings.active} onPress={() => router.push('/market/vendor/listings' as Href)} />
            <Stat label={t('mk.views')} value={d.views} />
            <Stat label={t('mk.visits')} value={d.store_visits} />
            <Stat label={t('mk.enquiries')} value={d.enquiries} />
            <Stat label={t('mk.unread')} value={d.unread} tone={d.unread ? 'alert' : undefined} onPress={() => router.push('/market/messages' as Href)} />
            <Stat label={t('mk.activePromos')} value={d.active_promotions} />
          </StatGrid>
          <View className="flex-row flex-wrap gap-2">
            {d.listings.pending ? <Pill label={t('mk.waitingApproval', { n: d.listings.pending })} tone="amber" /> : null}
            {d.listings.rejected ? <Pill label={t('mk.rejectedN', { n: d.listings.rejected })} tone="alert" /> : null}
            {d.listings.drafts ? <Pill label={t('mk.draftsN', { n: d.listings.drafts })} tone="grey" /> : null}
          </View>
          <Button title={t('mk.addProduct')} icon={icons.plus} onPress={() => router.push('/market/vendor/listing/new' as Href)} />
          <Card onPress={() => router.push('/market/vendor/plan' as Href)}>
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted">{t('mk.plan')}</Text>
            <Text className="text-[17px] font-bold text-navy">{s.plan?.name}</Text>
            {s.subscription?.ends_at ? <Text className="text-[13px] text-muted">{t('mk.until', { date: day(s.subscription.ends_at) })}</Text> : null}
          </Card>
          {d.daily?.length ? (
            <Card>
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted">{t('mk.lastDays', { n: d.days })}</Text>
              <View className="h-24 flex-row items-end gap-[2px]" accessibilityLabel={t('mk.views')}>
                {d.daily.map((p) => {
                  const max = Math.max(1, ...d.daily!.map((x) => x.views));
                  return <View key={p.day} className="flex-1 rounded-t bg-brand/80" style={{ height: `${Math.max(4, (100 * p.views) / max)}%` }} />;
                })}
              </View>
              {d.top_listings?.map((l) => (
                <Text key={l.id} className="text-[13px] text-ink" numberOfLines={1}>
                  {l.title} · {l.views} · {l.enquiries}
                </Text>
              ))}
            </Card>
          ) : s.plan && !s.plan.advanced_analytics ? (
            <Text className="text-[12.5px] text-muted">{t('mk.analyticsUpsell')}</Text>
          ) : null}
          <SectionLabel>{t('mk.messages')}</SectionLabel>
          {chats.data?.results.length ? (
            <ListGroup>
              {chats.data.results.slice(0, 5).map((c, i, arr) => (
                <Row key={c.id} title={`${c.buyer.name}${c.listing ? ` · ${c.listing.title}` : ''}`} sub={c.last_message}
                  icon={{ sf: 'bubble.left.fill', md: 'chat' }} tone={c.unread ? 'alert' : 'grey'} last={i === arr.length - 1}
                  onPress={() => router.push(`/market/messages/${c.id}` as Href)} />
              ))}
            </ListGroup>
          ) : (
            <Text className="text-[13px] text-muted">{t('mk.noChats')}</Text>
          )}
        </>
      ) : null}
    </Screen>
  );
}
