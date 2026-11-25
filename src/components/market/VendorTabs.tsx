/** The vendor area's sections, as a scrolling row of chips. */
import { router, type Href } from 'expo-router';

import { Choices } from '@/components/ui';
import { useT } from '@/i18n';

const TABS = [
  ['dash', 'mk.dashboard', '/market/vendor'],
  ['listings', 'mk.listings', '/market/vendor/listings'],
  ['messages', 'mk.messages', '/market/messages'],
  ['store', 'mk.storefront', '/market/vendor/store'],
  ['plan', 'mk.plan', '/market/vendor/plan'],
  ['promotions', 'mk.promotions', '/market/vendor/promotions'],
  ['adverts', 'mk.adverts', '/market/vendor/adverts'],
  ['team', 'mk.team', '/market/vendor/team'],
] as const;

export function VendorTabs({ here }: { here: (typeof TABS)[number][0] }) {
  const t = useT();
  return (
    <Choices
      scroll
      options={TABS.map(([key, label]) => ({ key, label: t(label) }))}
      value={here}
      onChange={(key) => {
        if (key === here) return;
        const target = TABS.find(([k]) => k === key)![2];
        router.push(target as Href);
      }}
    />
  );
}
