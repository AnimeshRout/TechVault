import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineShoppingCart,
  HiOutlineHeart,
  HiOutlineUser,
  HiOutlineSearch,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineLogout,
  HiOutlineClipboardList,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineHome,
} from 'react-icons/hi';
import useAuthStore from '../../stores/authStore';
import useCartStore from '../../stores/cartStore';
import useProductStore from '../../stores/productStore';
import useThemeStore from '../../stores/themeStore';
import './Navbar.css';

const categories = [
  { slug: 'mobiles', label: 'Mobiles' },
  { slug: 'laptops', label: 'Laptops' },
  { slug: 'tablets', label: 'Tablets' },
  { slug: 'audio', label: 'Audio' },
  { slug: 'pc-components', label: 'PC Components' },
  { slug: 'gaming-gear', label: 'Gaming Gear' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { cart } = useCartStore();
  const { suggestions } = useProductStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  const totalItems = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  // Debounce timer ref
  const debounceRef = useRef(null);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    // Debounced suggestions (300ms)
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      useProductStore.getState().fetchSuggestions(val);
    }, 300);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <img src="/logo.png" alt="TechVault" className="logo-img" />
          <span className="logo-text">TechVault</span>
        </Link>

        {/* Desktop Categories */}
        <div className="navbar-categories">
          <Link
            to="/"
            className={`nav-category ${location.pathname === '/' && !location.search ? 'active' : ''}`}
          >
            Home
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/products?category=${cat.slug}`}
              className={`nav-category ${location.search.includes(cat.slug) ? 'active' : ''}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Theme Toggle */}
          <button className="nav-action-btn" onClick={useThemeStore.getState().toggleTheme} aria-label="Toggle theme">
            {useThemeStore((s) => s.theme) === 'dark' ? <HiOutlineSun size={20} /> : <HiOutlineMoon size={20} />}
          </button>

          {/* Search Toggle */}
          <button className="nav-action-btn" onClick={() => setShowSearch(!showSearch)} aria-label="Search">
            <HiOutlineSearch size={20} />
          </button>

          {/* Wishlist */}
          {isAuthenticated && (
            <Link to="/wishlist" className="nav-action-btn" aria-label="Wishlist">
              <HiOutlineHeart size={20} />
            </Link>
          )}

          {/* Cart */}
          <Link to="/cart" className="nav-action-btn cart-btn" aria-label="Cart">
            <HiOutlineShoppingCart size={20} />
            {totalItems > 0 && (
              <motion.span
                className="cart-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={totalItems}
              >
                {totalItems}
              </motion.span>
            )}
          </Link>

          {/* User Menu */}
          {isAuthenticated ? (
            <div className="user-menu-wrapper" ref={userMenuRef}>
              <button className="nav-action-btn user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <HiOutlineUser size={20} />
                )}
              </button>
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    className="user-dropdown glass-card"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="user-info">
                      <p className="user-name">{user?.name}</p>
                      <p className="user-email">{user?.email}</p>
                    </div>
                    <div className="dropdown-divider" />
                    <Link to="/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <HiOutlineUser size={16} /> Profile
                    </Link>
                    <Link to="/orders" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <HiOutlineClipboardList size={16} /> My Orders
                    </Link>
                    <Link to="/wishlist" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <HiOutlineHeart size={16} /> Wishlist
                    </Link>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item text-danger" onClick={handleLogout}>
                      <HiOutlineLogout size={16} /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm nav-login-btn">
              Sign In
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button className="nav-action-btn mobile-menu-btn" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? <HiOutlineX size={22} /> : <HiOutlineMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="search-overlay"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            ref={searchRef}
          >
            <div className="container">
              <form className="search-form" onSubmit={handleSearchSubmit}>
                <HiOutlineSearch size={20} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search phones, laptops, audio gear..."
                  value={searchQuery}
                  onChange={handleSearch}
                  autoFocus
                />
              </form>
              {suggestions.length > 0 && searchQuery.length >= 2 && (
                <div className="search-results">
                  {suggestions.slice(0, 6).map((p) => (
                    <Link
                      key={p._id}
                      to={`/product/${p.slug}`}
                      className="search-result-item"
                      onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                    >
                      <img src={p.images?.[0]} alt={p.title} className="search-result-img" />
                      <div>
                        <p className="search-result-title">{p.title}</p>
                        <p className="search-result-price">${p.price}</p>
                      </div>
                    </Link>
                  ))}
                  <Link
                    to={`/products?search=${encodeURIComponent(searchQuery)}`}
                    className="search-result-item search-view-all"
                    onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  >
                    View all results for "{searchQuery}" →
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="mobile-menu-categories">
              <Link to="/" className="mobile-menu-item">
                <HiOutlineHome size={18} style={{ marginRight: 8 }} /> Home
              </Link>
              {categories.map((cat) => (
                <Link key={cat.slug} to={`/products?category=${cat.slug}`} className="mobile-menu-item">
                  {cat.label}
                </Link>
              ))}
            </div>
            {!isAuthenticated && (
              <Link to="/login" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Sign In
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
