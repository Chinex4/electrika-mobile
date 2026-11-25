/** Saved products and stores, and what you looked at lately. */
import { router, Stack, type Href } from 'expo-router';

import { ListingGrid, StoreLogo } from '@/components/market';
import { Empty, Failed, icons, ListGroup, Loading, Row, Screen, SectionLabel } from '@/components/ui';
import { useT } from '@/i18n';
import { useResource } from '@/store/hooks';
import type { ListingCard, VendorCard } from '@/types/market';

export default function Saved() {
  const t = useT();
  const favs = useResource<{ listings: ListingCard[]; stores: VendorCard[] }>('/market/favourites/');
  const recent = useResource<{ results: ListingCard[] }>('/market/recent/');
  return (
    <Screen refreshing={favs.isRefetching} onRefresh={() => { favs.refetch(); recent.refetch(); }}>
      <Stack.Screen options={{ title: t('mk.saved') }} />
      {favs.isLoading ? <Loading /> : null}
      {favs.error && !favs.data ? <Failed error={favs.error} onRetry={favs.refetch} /> : null}
      {favs.data ? (
        <>
          <SectionLabel>{t('mk.products')}</SectionLabel>
          {favs.data.listings.length ? <ListingGrid items={favs.data.listings} /> : <Empty title={t('mk.savedHint')} icon={{ sf: 'heart', md: 'favorite_border' }} />}
          <SectionLabel>{t('mk.stores')}</SectionLabel>
          {favs.data.stores.length ? (
            <ListGroup>
              {favs.data.stores.map((s, i) => (
                <Row key={s.id} title={s.name} sub={`${s.city}, ${s.state}`} right={<StoreLogo vendor={s} size={32} />}
                  last={i === favs.data!.stores.length - 1} onPress={() => router.push(`/store/${s.slug}` as Href)} />
              ))}
            </ListGroup>
          ) : (
            <Empty title={t('mk.noStores')} icon={icons.building} />
          )}
        </>
      ) : null}
      {recent.data?.results.length ? (
        <>
          <SectionLabel>{t('mk.recent')}</SectionLabel>
          <ListingGrid items={recent.data.results} />
        </>
      ) : null}
    </Screen>
  );
}
