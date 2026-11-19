import { Redirect } from 'expo-router';
import { useMemo } from 'react';

import { HOME_FOR } from '@/auth/roles';
import { useAppSelector, useResource } from '@/store/hooks';
import { selectCartCount, selectUser } from '@/store/selectors';
import type { Role } from '@/types/api';

import { RoleTabs } from './RoleTabs';
import { TABS } from './tabSets';

type Summary = { new_requests?: number; reports_to_sign?: number; voice_to_act?: number; transfers_to_confirm?: number };

/** Which summary count shows on which tab, per role. */
const BADGES: Partial<Record<Role, Record<string, keyof Summary>>> = {
  DISPATCH_COORDINATOR: { reports: 'reports_to_sign' },
  ACCOUNT_MANAGER: { requests: 'new_requests', voice: 'voice_to_act' },
  ACCOUNTS: { index: 'transfers_to_confirm' },
  ADMIN: { index: 'reports_to_sign' },
};

/** One role's area: signed out goes to sign-in, the wrong role goes home. */
export function RoleArea({ role }: { role: Role }) {
  const user = useAppSelector(selectUser);
  const cart = useAppSelector(selectCartCount);
  const office = role !== 'CLIENT' && role !== 'TECHNICIAN';
  const summary = useResource<Summary>(user?.role === role && office ? '/office/summary/' : null, { poll: 60_000 });

  const tabs = useMemo(() => {
    const map = BADGES[role] ?? {};
    return TABS[role].map((tab) => {
      if (role === 'CLIENT' && tab.name === 'shop') return { ...tab, badge: cart || undefined };
      const key = map[tab.name];
      return key ? { ...tab, badge: summary.data?.[key] || undefined } : tab;
    });
  }, [role, cart, summary.data]);

  if (!user) return <Redirect href="/sign-in" />;
  if (user.role !== role) return <Redirect href={HOME_FOR[user.role]} />;
  return <RoleTabs tabs={tabs} />;
}
