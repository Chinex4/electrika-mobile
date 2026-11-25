/** Shared pieces of the ElectriKa screens. */
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Linking, Pressable, Share, Text, View } from 'react-native';

import { api, remoteImage } from '@/api/client';
import { Banner, cx, Icon, icons } from '@/components/ui';
import { useT } from '@/i18n';
import { openCheckout } from '@/lib/pay';
import { notify } from '@/lib/toast';
import { naira } from '@/lib/format';
import { useResource } from '@/store/hooks';
import { useColors } from '@/theme';
import type { Ad, ListingCard, MarketConfig, VendorCard } from '@/types/market';

/** Count a tap on a sponsored listing or an advert (once a day per person; never blocks the tap). */
function count(path: string) {
  api(path, { method: 'POST', body: { kind: 'CLICK' } }).catch(() => {});
}

export function openListing(item: ListingCard) {
  if (item.sponsored && item.promotion_id) count(`/market/promotions/${item.promotion_id}/event/`);
  router.push(`/market/item/${item.slug}` as Href);
}

export function openAd(ad: Ad) {
  count(`/market/ads/${ad.id}/event/`);
  if (ad.listing_slug) router.push(`/market/item/${ad.listing_slug}` as Href);
  else if (ad.vendor_slug) router.push(`/store/${ad.vendor_slug}` as Href);
  else if (ad.category_slug) router.push(`/market?category=${encodeURIComponent(ad.category_slug)}` as Href);
  else if (ad.target_url) Linking.openURL(ad.target_url);
}

export function share(title: string, url: string, t: (k: string, v?: Record<string, string>) => string) {
  return Share.share({ message: t('mk.shareText', { title, url }), url, title }).catch(() => {});
}

export function useMarketConfig() {
  return useResource<MarketConfig>('/market/config/', { auth: false, refetchOnFocus: false }).data;
}

/** A product card, two to a row. */
export function ListingTile({ item }: { item: ListingCard }) {
  const t = useT();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${naira(item.price)}, ${item.sold_by}${item.sponsored ? `, ${t('mk.sponsored')}` : ''}`}
      onPress={() => openListing(item)}
      className="w-[48.5%] overflow-hidden rounded-2xl border border-line bg-surface active:opacity-90">
      <View className="aspect-square w-full bg-white">
        {item.image_url ? <Image source={remoteImage(item.image_url)} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={150} /> : null}
        {item.sponsored ? (
          <View className="absolute left-2 top-2 rounded-md bg-navy-fill/85 px-1.5 py-0.5">
            <Text className="text-[10px] font-bold uppercase text-white">{t('mk.sponsored')}</Text>
          </View>
        ) : null}
        {item.favourite ? (
          <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-white">
            <Icon name={{ sf: 'heart.fill', md: 'favorite' }} size={13} color={colors.alert} />
          </View>
        ) : null}
      </View>
      <View className="gap-1 border-t border-line/70 p-3">
        <Text className="text-sm font-semibold text-navy" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-sm font-bold text-accent">
          {naira(item.price)}
          {item.negotiable ? <Text className="text-[11px] font-medium text-muted"> · {t('mk.offers')}</Text> : null}
        </Text>
        <View className="flex-row items-center gap-1">
          {item.vendor.verified ? <Icon name={icons.seal} size={12} color={colors.leafInk} /> : null}
          <Text className="flex-1 text-[11.5px] text-muted" numberOfLines={1}>
            {item.sold_by}
          </Text>
        </View>
        <Text className="text-[11px] text-faint" numberOfLines={1}>
          {item.city}, {item.state}
          {item.condition !== 'NEW' ? ` · ${item.condition_label}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

export function ListingGrid({ items }: { items: ListingCard[] }) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {items.map((item) => (
        <ListingTile key={`${item.sponsored ? 's' : 'l'}${item.id}`} item={item} />
      ))}
    </View>
  );
}

export function AdBanner({ ad, tall }: { ad: Ad; tall?: boolean }) {
  const t = useT();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${t('mk.ad')}: ${ad.title}`} onPress={() => openAd(ad)} className="overflow-hidden rounded-2xl border border-line bg-mist active:opacity-90">
      <Image source={remoteImage(ad.image_url)} style={{ width: '100%', aspectRatio: tall ? 8 / 3 : 4 }} contentFit="cover" />
      <View className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5">
        <Text className="text-[10px] font-bold uppercase text-navy-fill">{t('mk.ad')}</Text>
      </View>
      {ad.subtitle ? (
        <View className="absolute inset-x-0 bottom-0 bg-black/45 px-3 py-1.5">
          <Text className="text-[12.5px] font-medium text-white" numberOfLines={1}>
            {ad.subtitle}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** The marketplace's payment notice, on every vendor product and chat. */
export function PaymentNotice({ text }: { text?: string }) {
  const config = useMarketConfig();
  const body = text ?? config?.payment_notice;
  if (!body) return null;
  return (
    <Banner tone="amber" icon={icons.warning}>
      {body}
    </Banner>
  );
}

export function StoreLogo({ vendor, size = 48 }: { vendor: Pick<VendorCard, 'logo_url' | 'name'>; size?: number }) {
  return vendor.logo_url ? (
    <Image source={remoteImage(vendor.logo_url)} style={{ width: size, height: size, borderRadius: size * 0.25 }} contentFit="cover" />
  ) : (
    <View className="items-center justify-center bg-haze" style={{ width: size, height: size, borderRadius: size * 0.25 }}>
      <Text className="font-bold text-accent" style={{ fontSize: size * 0.4 }}>
        {vendor.name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export function VerifiedLine({ vendor }: { vendor: Pick<VendorCard, 'verified' | 'status_label' | 'city' | 'state'> }) {
  const t = useT();
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-1">
      {vendor.verified ? <Icon name={icons.seal} size={13} color={colors.leafInk} /> : null}
      <Text className={cx('text-[12.5px]', vendor.verified ? 'font-semibold text-leaf-ink' : 'text-muted')} numberOfLines={1}>
        {vendor.verified ? t('mk.verifiedBusiness') : vendor.status_label} · {vendor.city}
      </Text>
    </View>
  );
}

/** Open Paystack for a vendor plan, promotion or advert, and say how it went. */
export async function payWith(checkoutUrl: string | undefined, t: (k: string) => string) {
  if (!checkoutUrl) return;
  const result = await openCheckout(checkoutUrl);
  if (result === 'paid') notify.success(t('mk.paid'));
  else if (result === 'pending') notify.info(t('mk.payPending'));
  else if (result === 'failed') notify.error(t('mk.payFailed'));
}
