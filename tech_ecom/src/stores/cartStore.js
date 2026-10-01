/**
 * Cart Store — Zustand
 * Server-synced cart state with optimistic UI updates.
 */
import { create } from 'zustand';
import api from '../api/axios';

const useCartStore = create((set, get) => ({
  cart: { items: [], totalItems: 0, subtotal: 0 },
  isLoading: false,

  fetchCart: async () => {
    try {
      const { data } = await api.get('/cart');
      set({ cart: data.data.cart });
    } catch {
      // Not logged in or error — keep empty cart
    }
  },

  addToCart: async (productId, quantity = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/cart', { productId, quantity });
      set({ cart: data.data.cart, isLoading: false });
      return data;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      const { data } = await api.put(`/cart/${itemId}`, { quantity });
      set({ cart: data.data.cart });
    } catch (err) {
      throw err;
    }
  },

  removeItem: async (itemId) => {
    try {
      const { data } = await api.delete(`/cart/${itemId}`);
      set({ cart: data.data.cart });
    } catch (err) {
      throw err;
    }
  },

  clearCart: async () => {
    try {
      const { data } = await api.delete('/cart/clear');
      set({ cart: data.data.cart });
    } catch (err) {
      throw err;
    }
  },

  resetCart: () => set({ cart: { items: [], totalItems: 0, subtotal: 0 } }),
}));

export default useCartStore;
