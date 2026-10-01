import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import useProductStore from '../../stores/productStore';
import ProductCard from '../../components/ui/ProductCard';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import { HiOutlineAdjustments, HiOutlineX } from 'react-icons/hi';
import { useState } from 'react';
import SEO from '../../components/ui/SEO';
import './ProductsPage.css';

const categoryLabels = {
  mobiles: 'Mobiles',
  laptops: 'Laptops',
  tablets: 'Tablets',
  audio: 'Audio',
  'pc-components': 'PC Components',
  'gaming-gear': 'Gaming Gear',
};

const sortOptions = [
  { value: '-rating', label: 'Top Rated' },
  { value: '-createdAt', label: 'Newest First' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-numReviews', label: 'Most Reviewed' },
];

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const {
    products, pagination, isLoading, filters,
    setFilter, fetchProducts, fetchBrands, brands, resetFilters,
  } = useProductStore();
  const [showFilters, setShowFilters] = useState(false);

  // Sync URL params to store
  useEffect(() => {
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    if (category !== filters.category) setFilter('category', category);
    if (search !== filters.search) setFilter('search', search);
  }, [searchParams]);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts();
    fetchBrands(filters.category);
  }, [filters.category, filters.brand, filters.sort, filters.page, filters.search, filters.minPrice, filters.maxPrice]);

  const activeCategory = filters.category;
  const pageTitle = filters.search
    ? `Search: "${filters.search}"`
    : activeCategory
    ? categoryLabels[activeCategory] || activeCategory
    : 'All Products';

  return (
    <div className="products-page">
      <SEO
        title={pageTitle}
        description={`Browse ${pageTitle} at TechVault. Find the best deals on premium tech & electronics.`}
        keywords={`${activeCategory || 'tech'}, electronics, buy online`}
      />
      <div className="container">
        {/* Header */}
        <div className="products-header">
          <div>
            <h1 className="section-title">{pageTitle}</h1>
            <p className="section-subtitle">{pagination.totalProducts} products found</p>
          </div>
          <div className="products-header-actions">
            <select
              className="input sort-select"
              value={filters.sort}
              onChange={(e) => setFilter('sort', e.target.value)}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button className="btn btn-secondary filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
              <HiOutlineAdjustments size={18} /> Filters
            </button>
          </div>
        </div>

        <div className="products-layout">
          {/* Filters Sidebar */}
          <aside className={`filters-sidebar glass-card ${showFilters ? 'open' : ''}`}>
            <div className="filters-header">
              <h3>Filters</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { resetFilters(); setShowFilters(false); }}>
                Clear All
              </button>
              <button className="filters-close-btn" onClick={() => setShowFilters(false)}>
                <HiOutlineX size={20} />
              </button>
            </div>

            {/* Category Filter */}
            <div className="filter-group">
              <h4 className="filter-label">Category</h4>
              <div className="filter-options">
                <button
                  className={`filter-chip ${!filters.category ? 'active' : ''}`}
                  onClick={() => setFilter('category', '')}
                >
                  All
                </button>
                {Object.entries(categoryLabels).map(([slug, label]) => (
                  <button
                    key={slug}
                    className={`filter-chip ${filters.category === slug ? 'active' : ''}`}
                    onClick={() => setFilter('category', slug)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Filter */}
            {brands.length > 0 && (
              <div className="filter-group">
                <h4 className="filter-label">Brand</h4>
                <div className="filter-options">
                  <button
                    className={`filter-chip ${!filters.brand ? 'active' : ''}`}
                    onClick={() => setFilter('brand', '')}
                  >
                    All Brands
                  </button>
                  {brands.slice(0, 12).map((b) => (
                    <button
                      key={b.brand}
                      className={`filter-chip ${filters.brand === b.brand ? 'active' : ''}`}
                      onClick={() => setFilter('brand', b.brand)}
                    >
                      {b.brand} ({b.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price Filter */}
            <div className="filter-group">
              <h4 className="filter-label">Price Range</h4>
              <div className="price-inputs">
                <input
                  type="number"
                  className="input"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilter('minPrice', e.target.value)}
                />
                <span>—</span>
                <input
                  type="number"
                  className="input"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilter('maxPrice', e.target.value)}
                />
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="products-content">
            {isLoading ? (
              <SkeletonGrid count={12} />
            ) : products.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">🔍</p>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {products.map((product, i) => (
                    <ProductCard key={product._id} product={product} index={i} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setFilter('page', pagination.currentPage - 1)}
                    >
                      ← Previous
                    </button>
                    <div className="pagination-pages">
                      {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            className={`btn btn-sm ${page === pagination.currentPage ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setFilter('page', page)}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={!pagination.hasNextPage}
                      onClick={() => setFilter('page', pagination.currentPage + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
