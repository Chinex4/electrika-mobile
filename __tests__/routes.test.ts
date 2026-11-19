/**
 * Every place the app navigates to must have a screen, and every role's
 * tab must have its route file. Checked by reading the source, so a
 * renamed screen fails here instead of on someone's phone.
 */
import fs from 'fs';
import path from 'path';

import { TABS } from '@/navigation/tabSets';
import { routeForNotification } from '@/notifications/route';
import type { Role } from '@/types/api';

const APP = path.join(__dirname, '..', 'src', 'app');

function routeFiles(dir = APP, base = ''): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = `${base}/${e.name}`;
    if (e.isDirectory()) return routeFiles(path.join(dir, e.name), rel);
    return /\.tsx$/.test(e.name) && !e.name.startsWith('_') ? [rel.replace(/\.tsx$/, '')] : [];
  });
}

// "/job/[id]/index" -> /^\/job\/[^/]+$/ ; groups like (auth) vanish from the URL.
const patterns = routeFiles().map((f) => {
  const url = f.replace(/\/\([^)]+\)/g, '').replace(/\/index$/, '') || '/';
  return new RegExp(`^${url.replace(/\[[^\]]+\]/g, '[^/]+')}$`);
});

const resolves = (href: string) => {
  const clean = href.split('?')[0].replace(/\/$/, '') || '/';
  return patterns.some((p) => p.test(clean));
};

function sources(dir = path.join(__dirname, '..', 'src')): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sources(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : [],
  );
}

describe('routes', () => {
  it('every router.push / replace / Link target has a screen', () => {
    const targets = new Set<string>();
    for (const file of sources()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/(?:router\.(?:push|replace|navigate)\(|href=|pathname: )['`]([^'`]+)['`]/g)) {
        targets.add(m[1].replace(/\$\{[^}]+\}/g, 'x'));
      }
    }
    expect(targets.size).toBeGreaterThan(40);
    const missing = [...targets].filter((t) => t.startsWith('/') && !resolves(t));
    expect(missing).toEqual([]);
  });

  it("every role's tabs have their screens", () => {
    const area: Record<Role, string> = { CLIENT: 'customer', TECHNICIAN: 'tech', DISPATCH_COORDINATOR: 'dispatch', ACCOUNT_MANAGER: 'am', ACCOUNTS: 'accounts', ADMIN: 'pm' };
    for (const [role, tabs] of Object.entries(TABS) as [Role, (typeof TABS)[Role]][]) {
      for (const tab of tabs) {
        expect(fs.existsSync(path.join(APP, area[role], `${tab.name}.tsx`))).toBe(true);
      }
    }
  });

  it('every notification route lands on a screen', () => {
    const samples = ['/dispatch/jobs/1/', '/dispatch/my-jobs/done/', '/dispatch/reports/2/', '/clients/portal/track/3/', '/clients/portal/visits/',
      '/clients/portal/invoices/', '/clients/portal/protections/', '/clients/portal/care/', '/help/r/t/', '/voice/staff/4/', '/voice/r/t/', '/shop/order/t/', '/safe/'];
    for (const s of samples) expect(resolves(String(routeForNotification(s, 'ADMIN')))).toBe(true);
  });
});
