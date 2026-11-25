/**
 * Notifications carry the website path they link to (NotificationLog
 * .action_path). This turns it into the matching app screen, so a tap on
 * "Your engineer is on the way" opens live tracking in the app, not the site.
 */
import type { Href } from 'expo-router';

import type { Role } from '@/types/api';

const RULES: [RegExp, (m: RegExpMatchArray, role: Role) => string | null][] = [
  [/^\/dispatch\/jobs\/(\d+)\/?/, (m) => `/job/${m[1]}`],
  [/^\/dispatch\/my-jobs\/done\/?/, () => '/tech/done'],
  [/^\/dispatch\/my-jobs\/?/, () => '/tech'],
  [/^\/dispatch\/reports\/(\d+)\/?/, (m) => `/office/review/${m[1]}`],
  [/^\/dispatch\/reports\/?/, (_m, role) => (role === 'ADMIN' ? '/office/reviews' : '/dispatch/reports')],
  [/^\/clients\/portal\/track\/(\d+)\/?/, (m) => `/track/${m[1]}`],
  [/^\/clients\/portal\/visits\/?/, () => '/visits'],
  [/^\/clients\/portal\/invoices\/?/, () => '/invoices'],
  [/^\/clients\/portal\/protections\/?/, () => '/protections'],
  [/^\/clients\/portal\/care\/?/, () => '/care'],
  [/^\/clients\/portal\/?$/, () => '/customer'],
  [/^\/help\/r\/([\w:-]+)\/?/, (m) => `/request/${m[1]}`],
  [/^\/voice\/staff\/(\d+)\/?/, (m) => `/office/voice/${m[1]}`],
  [/^\/voice\/r\/([\w:-]+)\/?/, (m) => `/power/${m[1]}`],
  [/^\/shop\/order\/([\w:-]+)\/?/, (m) => `/shop/order/${m[1]}`],
  [/^\/r\/[\w:-]+\/?/, () => '/visits'],
  [/^\/safe\/?/, () => '/care/safety'],
  // ElectriKa marketplace (25 Nov 2026)
  [/^\/market\/messages\/(\d+)\/?/, (m) => `/market/messages/${m[1]}`],
  [/^\/market\/messages\/?/, () => '/market/messages'],
  [/^\/market\/vendor\/listings\/(\d+)\/?/, (m) => `/market/vendor/listing/${m[1]}`],
  [/^\/market\/vendor\/(plan|promotions|adverts|listings|store|team)\/?/, (m) => `/market/vendor/${m[1]}`],
  [/^\/market\/vendor\/?/, () => '/market/vendor'],
  [/^\/market\/item\/([\w-]+)\/?/, (m) => `/market/item/${m[1]}`],
  [/^\/store\/([\w-]+)\/?/, (m) => `/store/${m[1]}`],
  [/^\/market\/?/, () => '/market'],
];

export function routeForNotification(path: string | null | undefined, role: Role): Href | null {
  if (!path) return null;
  const clean = path.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  for (const [re, to] of RULES) {
    const m = clean.match(re);
    if (m) {
      const target = to(m, role);
      if (target) return target as Href;
    }
  }
  return null;
}
