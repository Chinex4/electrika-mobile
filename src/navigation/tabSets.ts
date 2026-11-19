import type { Role } from '@/auth/session';

import type { TabSpec } from './RoleTabs';

/** Each role's bottom tabs, following what they do on the website. */
export const TABS: Record<Role, TabSpec[]> = {
  CLIENT: [
    { name: 'index', label: 'tab.home', sf: 'house', sfSelected: 'house.fill', md: 'home' },
    { name: 'activity', label: 'tab.activity', sf: 'list.bullet.rectangle', sfSelected: 'list.bullet.rectangle.fill', md: 'receipt_long' },
    { name: 'shop', label: 'tab.shop', sf: 'bag', sfSelected: 'bag.fill', md: 'shopping_bag' },
    { name: 'account', label: 'tab.account', sf: 'person.crop.circle', sfSelected: 'person.crop.circle.fill', md: 'account_circle' },
  ],
  TECHNICIAN: [
    { name: 'index', label: 'tab.jobs', sf: 'wrench.and.screwdriver', sfSelected: 'wrench.and.screwdriver.fill', md: 'build' },
    { name: 'done', label: 'tab.done', sf: 'checkmark.circle', sfSelected: 'checkmark.circle.fill', md: 'task_alt' },
    { name: 'me', label: 'tab.me', sf: 'person.text.rectangle', sfSelected: 'person.text.rectangle.fill', md: 'badge' },
  ],
  DISPATCH_COORDINATOR: [
    { name: 'index', label: 'tab.board', sf: 'square.grid.2x2', sfSelected: 'square.grid.2x2.fill', md: 'dashboard' },
    { name: 'reports', label: 'tab.reports', sf: 'checkmark.seal', sfSelected: 'checkmark.seal.fill', md: 'verified' },
    { name: 'orders', label: 'tab.orders', sf: 'shippingbox', sfSelected: 'shippingbox.fill', md: 'inventory_2' },
    { name: 'me', label: 'tab.me', sf: 'person.crop.circle', sfSelected: 'person.crop.circle.fill', md: 'account_circle' },
  ],
  ACCOUNT_MANAGER: [
    { name: 'index', label: 'tab.today', sf: 'sun.max', sfSelected: 'sun.max.fill', md: 'today' },
    { name: 'requests', label: 'tab.requests', sf: 'tray', sfSelected: 'tray.fill', md: 'inbox' },
    { name: 'voice', label: 'tab.voice', sf: 'megaphone', sfSelected: 'megaphone.fill', md: 'campaign' },
    { name: 'me', label: 'tab.me', sf: 'person.crop.circle', sfSelected: 'person.crop.circle.fill', md: 'account_circle' },
  ],
  ACCOUNTS: [
    { name: 'index', label: 'tab.money', sf: 'banknote', sfSelected: 'banknote.fill', md: 'payments' },
    { name: 'invoices', label: 'tab.invoices', sf: 'doc.text', sfSelected: 'doc.text.fill', md: 'description' },
    { name: 'orders', label: 'tab.orders', sf: 'shippingbox', sfSelected: 'shippingbox.fill', md: 'inventory_2' },
    { name: 'me', label: 'tab.me', sf: 'person.crop.circle', sfSelected: 'person.crop.circle.fill', md: 'account_circle' },
  ],
  ADMIN: [
    { name: 'index', label: 'tab.today', sf: 'chart.bar', sfSelected: 'chart.bar.fill', md: 'insights' },
    { name: 'board', label: 'tab.board', sf: 'square.grid.2x2', sfSelected: 'square.grid.2x2.fill', md: 'dashboard' },
    { name: 'console', label: 'tab.console', sf: 'lock.shield', sfSelected: 'lock.shield.fill', md: 'admin_panel_settings' },
    { name: 'me', label: 'tab.me', sf: 'person.crop.circle', sfSelected: 'person.crop.circle.fill', md: 'account_circle' },
  ],
};
