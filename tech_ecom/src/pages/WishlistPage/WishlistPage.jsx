import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineHeart, HiOutlineTrash } from 'react-icons/hi';
import useAuthStore from '../../stores/authStore';
import api from '../../api/axios';
import ProductCard from '../../components/ui/ProductCard';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      const { data } = await api.get('/users/wishlist');
      setProducts(data.data.wishlist || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchWishlist();
    else setLoading(false);
  }, [isAuthenticated, user?.wishlist?.length]);

  if (!isAuthenticated) {
    return (
      <div style={{ paddingTop: 'var(--space-xl)', minHeight: '80vh' }}><div className="container">
        <div className="empty-state">
          <p className="empty-icon">❤️</p>
          <h3>Please sign in to view your wishlist</h3>
          <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 16 }}>Sign In</Link>
        </div>
      </div></div>
    );
  }

  return (
    <div style={{ paddingTop: 'var(--space-xl)', minHeight: '80vh' }}>
      <div className="container">
        <h1 className="section-title">My Wishlist</h1>
        <p className="section-subtitle">{products.length} item{products.length !== 1 && 's'} saved</p>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '4rem' }}>Loading...</p>
        ) : products.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '2rem' }}>
            <p className="empty-icon">❤️</p>
            <h3>Your wishlist is empty</h3>
            <p>Save products you love and come back to them later</p>
            <Link to="/products" className="btn btn-primary btn-lg" style={{ marginTop: 16 }}>Browse Products</Link>
          </div>
        ) : (
          <div className="product-grid" style={{ marginTop: '1.5rem' }}>
            {products.map((product, i) => (
              <ProductCard key={product._id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
