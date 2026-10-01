/**
 * Product Store — Zustand
 * Product listing, search, filters, and individual product state.
 */
import { create } from 'zustand';
import api from '../api/axios';

const useProductStore = create((set, get) => ({
  products: [],
  product: null,
  featured: [],
  searchResults: [],
  suggestions: [],
  brands: [],
  priceRange: { minPrice: 0, maxPrice: 10000 },
  pagination: { currentPage: 1, totalPages: 1, totalProducts: 0 },
  isLoading: false,
  filters: {
    category: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    sort: '-rating',
    page: 1,
    search: '',
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value, page: key === 'page' ? value : 1 },
    }));
  },

  resetFilters: () => {
    set({
      filters: { category: '', brand: '', minPrice: '', maxPrice: '', sort: '-rating', page: 1, search: '' },
    });
  },

  fetchProducts: async (params = {}) => {
    set({ isLoading: true });
    try {
      const filters = get().filters;
      const query = new URLSearchParams();
      if (filters.category) query.set('category', filters.category);
      if (filters.brand) query.set('brand', filters.brand);
      if (filters.minPrice) query.set('price[gte]', filters.minPrice);
      if (filters.maxPrice) query.set('price[lte]', filters.maxPrice);
      if (filters.sort) query.set('sort', filters.sort);
      if (filters.search) query.set('search', filters.search);
      query.set('page', filters.page);
      query.set('limit', '12');
      Object.entries(params).forEach(([k, v]) => query.set(k, v));

      const { data } = await api.get(`/products?${query.toString()}`);
      set({ products: data.data.products, pagination: data.pagination, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchProductBySlug: async (slug) => {
    set({ isLoading: true, product: null });
    try {
      const { data } = await api.get(`/products/slug/${slug}`);
      set({ product: data.data.product, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchFeatured: async () => {
    try {
      const { data } = await api.get('/products/featured?limit=8');
      set({ featured: data.data.products });
    } catch {
      // silent
    }
  },

  searchProducts: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [], suggestions: [] });
      return;
    }
    try {
      const { data } = await api.get(`/products/search?q=${encodeURIComponent(query)}`);
      set({ searchResults: data.data.products, suggestions: data.data.suggestions });
    } catch {
      // silent
    }
  },

  fetchSuggestions: async (query) => {
    if (!query || query.length < 2) {
      set({ suggestions: [] });
      return;
    }
    try {
      const { data } = await api.get(`/products/suggestions?q=${encodeURIComponent(query)}`);
      set({ suggestions: data.data.suggestions });
    } catch {
      // silent
    }
  },

  fetchBrands: async (category = '') => {
    try {
      const q = category ? `?category=${category}` : '';
      const { data } = await api.get(`/products/brands${q}`);
      set({ brands: data.data.brands });
    } catch {
      // silent
    }
  },

  fetchPriceRange: async (category = '') => {
    try {
      const q = category ? `?category=${category}` : '';
      const { data } = await api.get(`/products/price-range${q}`);
      set({ priceRange: data.data });
    } catch {
      // silent
    }
  },
}));

export default useProductStore;
