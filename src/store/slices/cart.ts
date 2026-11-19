/**
 * The Shop cart lives on the phone (saved by the store's listener) and is
 * priced by the server (POST /api/shop/cart/), which drops anything that
 * can't be bought any more. Checkout hands the same items to the server.
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

import { api, toFailure } from '@/api/client';
import type { ApiFailure, Product } from '@/types/api';

export const CART_KEY = 'electrika.cart';
export const MAX_QTY = 99;

export type CartItem = {
  product_id: number;
  qty: number;
  name: string;
  slug: string;
  price: string | null;
  image_url: string | null;
};

export type PricedLine = { product: Product; qty: number; total: string };

export type CartState = {
  items: CartItem[];
  loaded: boolean;
  priced: { lines: PricedLine[]; subtotal: string } | null;
  pricing: boolean;
  error: ApiFailure | null;
};

const initialState: CartState = { items: [], loaded: false, priced: null, pricing: false, error: null };

export const loadCart = createAsyncThunk('cart/load', async () => {
  try {
    const raw = await SecureStore.getItemAsync(CART_KEY);
    const items = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(items) ? items.filter((i) => i && typeof i.product_id === 'number' && i.qty > 0) : [];
  } catch {
    return [];
  }
});

export const priceCart = createAsyncThunk<CartState['priced'], void, { state: { cart: CartState }; rejectValue: ApiFailure }>(
  'cart/price',
  async (_, { getState, rejectWithValue }) => {
    const items = getState().cart.items.map(({ product_id, qty }) => ({ product_id, qty }));
    try {
      return await api<NonNullable<CartState['priced']>>('/shop/cart/', { method: 'POST', auth: false, body: { items } });
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
);

const clamp = (n: number) => Math.max(0, Math.min(MAX_QTY, Math.floor(n)));

const cart = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<{ product: Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'image_url'>; qty?: number }>) {
      const { product, qty = 1 } = action.payload;
      const line = state.items.find((i) => i.product_id === product.id);
      if (line) line.qty = clamp(line.qty + qty);
      else
        state.items.push({
          product_id: product.id,
          qty: clamp(qty),
          name: product.name,
          slug: product.slug,
          price: product.price,
          image_url: product.image_url,
        });
      state.items = state.items.filter((i) => i.qty > 0);
    },
    setQty(state, action: PayloadAction<{ productId: number; qty: number }>) {
      const line = state.items.find((i) => i.product_id === action.payload.productId);
      if (line) line.qty = clamp(action.payload.qty);
      state.items = state.items.filter((i) => i.qty > 0);
    },
    removeFromCart(state, action: PayloadAction<number>) {
      state.items = state.items.filter((i) => i.product_id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
      state.priced = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(loadCart.fulfilled, (state, a) => {
      // Anything added before the saved cart loaded wins over the saved copy.
      const added = new Set(state.items.map((i) => i.product_id));
      state.items = [...state.items, ...a.payload.filter((i) => !added.has(i.product_id))];
      state.loaded = true;
    });
    b.addCase(priceCart.pending, (state) => {
      state.pricing = true;
      state.error = null;
    });
    b.addCase(priceCart.fulfilled, (state, a) => {
      state.pricing = false;
      state.priced = a.payload;
      // Drop what the server says can't be bought any more.
      const kept = new Set((a.payload?.lines ?? []).map((l) => l.product.id));
      state.items = state.items.filter((i) => kept.has(i.product_id));
    });
    b.addCase(priceCart.rejected, (state, a) => {
      state.pricing = false;
      state.error = a.payload ?? null;
    });
  },
});

export const { addToCart, setQty, removeFromCart, clearCart } = cart.actions;
export default cart.reducer;
