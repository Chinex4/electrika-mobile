import * as SecureStore from 'expo-secure-store';

import { selectCartCount, selectCartEstimate, selectCartQty } from '@/store/selectors';
import cartReducer, { addToCart, CART_KEY, clearCart, loadCart, MAX_QTY, priceCart, removeFromCart, setQty } from '@/store/slices/cart';

import { freshStore, mockFetch } from '../helpers';

const socket = { id: 1, name: 'Twin socket', slug: 'twin-socket', price: '4500.00', image_url: null };
const breaker = { id: 2, name: 'Breaker', slug: 'breaker', price: '12000.00', image_url: null };

describe('cart slice', () => {
  it('adds, merges and caps quantities', () => {
    let s = cartReducer(undefined, addToCart({ product: socket }));
    s = cartReducer(s, addToCart({ product: socket, qty: 2 }));
    expect(s.items).toHaveLength(1);
    expect(s.items[0].qty).toBe(3);
    s = cartReducer(s, setQty({ productId: 1, qty: 500 }));
    expect(s.items[0].qty).toBe(MAX_QTY);
  });

  it('drops a line set to zero, and removes or clears', () => {
    let s = cartReducer(undefined, addToCart({ product: socket }));
    s = cartReducer(s, addToCart({ product: breaker }));
    s = cartReducer(s, setQty({ productId: 1, qty: 0 }));
    expect(s.items.map((i) => i.product_id)).toEqual([2]);
    s = cartReducer(s, removeFromCart(2));
    expect(s.items).toEqual([]);
    s = cartReducer(cartReducer(s, addToCart({ product: socket })), clearCart());
    expect(s.items).toEqual([]);
  });

  it('counts and estimates through selectors', () => {
    const store = freshStore();
    store.dispatch(addToCart({ product: socket, qty: 2 }));
    store.dispatch(addToCart({ product: breaker }));
    const state = store.getState();
    expect(selectCartCount(state)).toBe(3);
    expect(selectCartEstimate(state)).toBe(21000);
    expect(selectCartQty(1)(state)).toBe(2);
    expect(selectCartQty(99)(state)).toBe(0);
  });

  it('prices on the server and drops what can no longer be bought', async () => {
    const { calls } = mockFetch({
      '/shop/cart/': { body: { lines: [{ product: { id: 2 }, qty: 1, total: '12000.00' }], subtotal: '12000.00' } },
    });
    const store = freshStore();
    store.dispatch(addToCart({ product: socket }));
    store.dispatch(addToCart({ product: breaker }));
    await store.dispatch(priceCart());
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ items: [{ product_id: 1, qty: 1 }, { product_id: 2, qty: 1 }] });
    expect(store.getState().cart.items.map((i) => i.product_id)).toEqual([2]);
    expect(store.getState().cart.priced?.subtotal).toBe('12000.00');
  });

  it('is saved on the phone and loaded back', async () => {
    const store = freshStore();
    store.dispatch(addToCart({ product: socket, qty: 4 }));
    await new Promise((r) => setTimeout(r, 0));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CART_KEY, expect.stringContaining('"qty":4'));

    const next = freshStore();
    await next.dispatch(loadCart());
    expect(next.getState().cart.items[0]).toMatchObject({ product_id: 1, qty: 4 });
  });
});
