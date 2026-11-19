import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { tokenStore } from '@/api/client';
import Cart from '@/app/shop/cart';
import JobScreen from '@/app/job/[id]/index';
import { addToCart } from '@/store/slices/cart';
import { startSharing } from '@/tracking/journey';

import { freshStore, mockFetch } from '../helpers';

jest.mock('@/tracking/journey', () => ({
  startSharing: jest.fn(async () => 'background'),
  stopSharing: jest.fn(async () => undefined),
  hereNow: jest.fn(async () => null),
  sharingJob: jest.fn(async () => null),
}));
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), dismissAll: jest.fn() },
    Stack: { Screen: () => null },
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useLocalSearchParams: () => ({ id: '42' }),
    useFocusEffect: jest.fn(),
  };
});
jest.mock('expo-image', () => ({ Image: () => null }));

const job = {
  id: 42, type: 'EMERGENCY', type_label: 'Emergency', status: 'ASSIGNED', status_label: 'Assigned', sla_state: 'ON_TRACK', on_plan: true,
  raised_at: '2026-11-19T08:00:00Z', scheduled_for: null, sla_deadline: '2026-11-19T11:00:00Z', responded_at: null, completed_at: null,
  site: { id: 1, name: 'Obi home', address: '12 Zik Ave', address_line: '12 Zik Ave', area: 'GRA', area_label: 'GRA', landmark: '', lat: null, lng: null, pinned: false },
  client_name: 'Ada', technician: null, trackable: false, description: 'Sparks from the kitchen socket.', photos: [],
  client: { name: 'Ada Obi', contact_name: 'Ada', phone: '0803' }, client_log: [], is_my_job: true, can_act: true, can_submit_report: true,
  can_coordinate: false, needs_location_consent: true, report: null, sent_back: null, review_mode: 'AFTER', review_modes: [], findings: [], parts: [], countdown: '2 h 40 min left',
};

describe('job page (engineer)', () => {
  beforeEach(async () => {
    await tokenStore.set('tok');
  });

  it('asks for location consent once, then starts the journey', async () => {
    const { calls } = mockFetch({
      '/job/42/on-my-way/': { body: { job: { ...job, status: 'EN_ROUTE' }, detail: 'Safe journey.' } },
      '/job/42/': { body: job },
    });
    await render(
      <Provider store={freshStore()}>
        <JobScreen />
      </Provider>,
    );
    expect(await screen.findByText('Sparks from the kitchen socket.')).toBeTruthy();
    await fireEvent.press(screen.getByText("I'm on my way"));
    expect(screen.getByText('Share your location on the way?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Yes, share it'));
    await waitFor(() => expect(startSharing).toHaveBeenCalledWith(42));
    const post = calls.find((c) => c.path === '/job/42/on-my-way/');
    expect(JSON.parse(String(post?.init?.body))).toEqual({ consent: true });
  });
});

describe('cart', () => {
  it('prices the cart on the server and shows the subtotal', async () => {
    mockFetch({
      '/shop/cart/': { body: { lines: [{ product: { id: 1, name: 'Twin socket' }, qty: 2, total: '9000.00' }], subtotal: '9000.00' } },
    });
    const store = freshStore();
    store.dispatch(addToCart({ product: { id: 1, name: 'Twin socket', slug: 'twin', price: '4500.00', image_url: null }, qty: 2 }));
    await render(
      <Provider store={store}>
        <Cart />
      </Provider>,
    );
    expect(await screen.findAllByText('₦9,000')).toHaveLength(2);
    expect(screen.getByText('Checkout')).toBeTruthy();
  });

  it('says so when empty', async () => {
    await render(
      <Provider store={freshStore()}>
        <Cart />
      </Provider>,
    );
    expect(screen.getByText('Your cart is empty')).toBeTruthy();
  });
});
