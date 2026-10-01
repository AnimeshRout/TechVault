import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineHeart, HiHeart, HiOutlineShoppingCart, HiStar } from 'react-icons/hi';
import { useState, useMemo } from 'react';
import useCartStore from '../../stores/cartStore';
import useAuthStore from '../../stores/authStore';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import './ProductCard.css';

export default function ProductCard({ product, index = 0 }) {
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

  // Check if this product is already in the user's wishlist
  const initialWishlisted = useMemo(() => {
    if (!user?.wishlist?.length) return false;
    return user.wishlist.some(
      (item) => (item._id || item) === product._id
    );
  }, [user?.wishlist, product._id]);

  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted);
  const [imgLoaded, setImgLoaded] = useState(false);

  const effectivePrice = product.discountPrice > 0 ? product.discountPrice : product.price;
  const discountPercent = product.discountPrice > 0
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to add items to cart');
      return;
    }
    try {
      await addToCart(product._id);
      toast.success(`${product.title.slice(0, 30)}... added to cart`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to use wishlist');
      return;
    }
    try {
      if (isWishlisted) {
        await api.delete(`/users/wishlist/${product._id}`);
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        await api.post('/users/wishlist', { productId: product._id });
        setIsWishlisted(true);
        toast.success('Added to wishlist');
      }
      // Refresh user data so wishlist stays in sync globally
      try {
        const { data } = await api.get('/auth/me');
        useAuthStore.setState({ user: data.data.user });
      } catch {}
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link to={`/product/${product.slug}`} className="product-card">
        {/* Image */}
        <div className="product-card-img-wrapper">
          {!imgLoaded && <div className="skeleton product-card-skeleton" />}
          <img
            src={product.images?.[0]}
            alt={product.title}
            className={`product-card-img ${imgLoaded ? 'loaded' : ''}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />

          {/* Badges */}
          <div className="product-card-badges">
            {discountPercent > 0 && (
              <span className="price-discount-badge">-{discountPercent}%</span>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <span className="badge badge-warning">Few Left</span>
            )}
            {product.stock === 0 && (
              <span className="badge badge-error">Sold Out</span>
            )}
          </div>

          {/* Hover Actions */}
          <div className="product-card-actions">
            <button className="product-action-btn" onClick={handleToggleWishlist} aria-label="Wishlist">
              {isWishlisted ? <HiHeart size={18} color="#ef4444" /> : <HiOutlineHeart size={18} />}
            </button>
            <button
              className="product-action-btn add-cart-btn"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              aria-label="Add to cart"
            >
              <HiOutlineShoppingCart size={18} />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="product-card-info">
          <p className="product-card-brand">{product.brand}</p>
          <h3 className="product-card-title">{product.title}</h3>

          <div className="product-card-rating">
            <HiStar className="star-filled" size={14} />
            <span>{product.rating?.toFixed(1)}</span>
            <span className="rating-count">({product.numReviews})</span>
          </div>

          <div className="product-card-price">
            <span className="price-current">${effectivePrice.toLocaleString()}</span>
            {discountPercent > 0 && (
              <span className="price-original">${product.price.toLocaleString()}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
