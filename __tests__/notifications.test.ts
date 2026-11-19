import { routeForNotification } from '@/notifications/route';

describe('notification taps open the matching app screen', () => {
  it.each([
    ['/dispatch/jobs/42/', 'TECHNICIAN', '/job/42'],
    ['/dispatch/my-jobs/', 'TECHNICIAN', '/tech'],
    ['/dispatch/reports/9/', 'DISPATCH_COORDINATOR', '/office/review/9'],
    ['/dispatch/reports/', 'ADMIN', '/office/reviews'],
    ['/clients/portal/track/5/', 'CLIENT', '/track/5'],
    ['/clients/portal/visits/', 'CLIENT', '/visits'],
    ['/clients/portal/invoices/', 'CLIENT', '/invoices'],
    ['/help/r/abc:123/', 'CLIENT', '/request/abc:123'],
    ['/voice/staff/8/', 'ACCOUNT_MANAGER', '/office/voice/8'],
    ['/voice/r/tok/', 'CLIENT', '/power/tok'],
    ['/shop/order/tok-1/', 'CLIENT', '/shop/order/tok-1'],
    ['https://electrika.ng/safe/', 'CLIENT', '/care/safety'],
  ] as const)('%s → %s', (path, role, to) => {
    expect(routeForNotification(path, role)).toBe(to);
  });

  it('returns null for paths the app has no screen for', () => {
    expect(routeForNotification('/legal/terms/', 'CLIENT')).toBeNull();
    expect(routeForNotification('', 'CLIENT')).toBeNull();
  });
});
