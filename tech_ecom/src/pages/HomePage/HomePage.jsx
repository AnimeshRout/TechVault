import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineDeviceMobile,
  HiOutlineDesktopComputer,
  HiOutlineChip,
  HiOutlineMusicNote,
  HiOutlineCube,
  HiOutlineLightningBolt,
} from 'react-icons/hi';
import useProductStore from '../../stores/productStore';
import ProductCard from '../../components/ui/ProductCard';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import SEO from '../../components/ui/SEO';
import './HomePage.css';

const categories = [
  { slug: 'mobiles', label: 'Mobiles', icon: HiOutlineDeviceMobile, color: '#6366f1' },
  { slug: 'laptops', label: 'Laptops', icon: HiOutlineDesktopComputer, color: '#06b6d4' },
  { slug: 'tablets', label: 'Tablets', icon: HiOutlineCube, color: '#8b5cf6' },
  { slug: 'audio', label: 'Audio', icon: HiOutlineMusicNote, color: '#f59e0b' },
  { slug: 'pc-components', label: 'PC Parts', icon: HiOutlineChip, color: '#10b981' },
  { slug: 'gaming-gear', label: 'Gaming', icon: HiOutlineLightningBolt, color: '#ef4444' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function HomePage() {
  const { featured, fetchFeatured, isLoading } = useProductStore();

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  return (
    <div className="home-page">
      <SEO
        title="Home"
        description="Shop premium tech & electronics at TechVault. Latest smartphones, laptops, audio gear, PC components & gaming accessories at unbeatable prices."
        keywords="tech store, electronics, smartphones, laptops, audio, PC components, gaming gear"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'TechVault',
          url: window.location.origin,
          description: 'Premium tech & electronics store',
        }}
      />
      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg-effects">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-grid-overlay" />
        </div>

        <div className="container hero-content">
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="hero-badge badge badge-primary">
              🚀 New Arrivals — 2024 Collection
            </span>
            <h1 className="hero-title">
              Premium Tech &
              <br />
              <span className="gradient-text">Electronics Store</span>
            </h1>
            <p className="hero-subtitle">
              Discover cutting-edge devices from the world's top brands. From flagship smartphones
              to high-performance gaming rigs — all in one place.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="btn btn-primary btn-lg">
                Shop All Products
              </Link>
              <Link to="/products?isFeatured=true" className="btn btn-secondary btn-lg">
                View Featured
              </Link>
            </div>

            {/* Stats */}
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-number">105+</span>
                <span className="stat-label">Products</span>
              </div>
              <div className="hero-stat">
                <span className="stat-number">50+</span>
                <span className="stat-label">Brands</span>
              </div>
              <div className="hero-stat">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Support</span>
              </div>
              <div className="hero-stat">
                <span className="stat-number">Free</span>
                <span className="stat-label">Shipping $500+</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="hero-glow-card glass-card">
              <img
                src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=85"
                alt="Featured Device"
                className="hero-device-img"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CATEGORIES GRID ─────────────────────────────────────── */}
      <section className="section categories-section">
        <div className="container">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="section-header">
              <h2 className="section-title">Browse Categories</h2>
              <p className="section-subtitle">Explore our curated collection of premium tech</p>
            </motion.div>

            <div className="categories-grid">
              {categories.map((cat) => (
                <motion.div key={cat.slug} variants={fadeUp}>
                  <Link to={`/products?category=${cat.slug}`} className="category-card glass-card">
                    <div className="category-icon" style={{ color: cat.color, background: `${cat.color}15` }}>
                      <cat.icon size={28} />
                    </div>
                    <span className="category-label">{cat.label}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ───────────────────────────────────── */}
      <section className="section featured-section">
        <div className="container">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="section-header">
              <div>
                <h2 className="section-title">Featured Products</h2>
                <p className="section-subtitle">Handpicked top-rated gear from our catalog</p>
              </div>
              <Link to="/products?isFeatured=true" className="btn btn-secondary">
                View All →
              </Link>
            </motion.div>

            {isLoading ? (
              <SkeletonGrid count={8} />
            ) : (
              <div className="product-grid">
                {featured.map((product, i) => (
                  <ProductCard key={product._id} product={product} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── TRUST BANNER ────────────────────────────────────────── */}
      <section className="section trust-section">
        <div className="container">
          <div className="trust-grid">
            {[
              { icon: '🔒', title: 'Secure Payments', desc: 'SSL encrypted checkout' },
              { icon: '🚚', title: 'Fast Shipping', desc: 'Free on orders $500+' },
              { icon: '↩️', title: 'Easy Returns', desc: '30-day return policy' },
              { icon: '💬', title: '24/7 Support', desc: 'Always here to help' },
            ].map((item) => (
              <div key={item.title} className="trust-card glass-card">
                <span className="trust-icon">{item.icon}</span>
                <h4 className="trust-title">{item.title}</h4>
                <p className="trust-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
