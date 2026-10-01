import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiStar, HiOutlineHeart, HiHeart, HiOutlineShoppingCart, HiOutlineCheck, HiOutlineTruck } from 'react-icons/hi';
import useProductStore from '../../stores/productStore';
import useCartStore from '../../stores/cartStore';
import useAuthStore from '../../stores/authStore';
import { SkeletonBlock, SkeletonLine } from '../../components/ui/Skeleton';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import SEO from '../../components/ui/SEO';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { product, fetchProductBySlug, isLoading } = useProductStore();
  const { addToCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchProductBySlug(slug);
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (product?._id) {
      api.get(`/reviews/product/${product._id}`)
        .then(({ data }) => setReviews(data.data.reviews))
        .catch(() => {});
    }
  }, [product?._id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) return toast.error('Please sign in to add items to cart');
    try {
      await addToCart(product._id, quantity);
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    }
  };

  const toggleWishlist = async () => {
    if (!isAuthenticated) return toast.error('Please sign in');
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
    } catch { toast.error('Failed'); }
  };

  if (isLoading || !product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="detail-grid">
            <div className="detail-gallery"><SkeletonBlock height={500} /></div>
            <div className="detail-info">
              <SkeletonLine width="30%" height={14} style={{ marginBottom: 12 }} />
              <SkeletonLine width="80%" height={28} style={{ marginBottom: 8 }} />
              <SkeletonLine width="60%" height={28} style={{ marginBottom: 16 }} />
              <SkeletonLine width="40%" height={32} style={{ marginBottom: 24 }} />
              <SkeletonBlock height={100} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const effectivePrice = product.discountPrice > 0 ? product.discountPrice : product.price;
  const discountPercent = product.discountPrice > 0
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;
  const specsEntries = product.specs ? [...product.specs.entries ? product.specs.entries() : Object.entries(product.specs)] : [];

  return (
    <div className="product-detail-page">
      <SEO
        title={product.title}
        description={product.description?.slice(0, 160)}
        image={product.images?.[0]}
        keywords={`${product.brand}, ${product.category}, ${product.title}`}
        type="product"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          image: product.images,
          description: product.description,
          brand: { '@type': 'Brand', name: product.brand },
          offers: {
            '@type': 'Offer',
            price: effectivePrice,
            priceCurrency: 'USD',
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
          ...(product.rating > 0 && {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: product.rating,
              reviewCount: product.numReviews || 1,
            },
          }),
        }}
      />
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to={`/products?category=${product.category}`}>{product.category}</Link>
          <span>/</span>
          <span>{product.title}</span>
        </div>

        <div className="detail-grid">
          {/* Gallery */}
          <motion.div className="detail-gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="gallery-main">
              <img src={product.images?.[selectedImage]} alt={product.title} className="gallery-img" />
            </div>
            {product.images?.length > 1 && (
              <div className="gallery-thumbs">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    className={`gallery-thumb ${selectedImage === i ? 'active' : ''}`}
                    onClick={() => setSelectedImage(i)}
                  >
                    <img src={img} alt={`${product.title} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div className="detail-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <p className="detail-brand">{product.brand}</p>
            <h1 className="detail-title">{product.title}</h1>

            <div className="detail-rating">
              <div className="stars">
                {[1,2,3,4,5].map((s) => (
                  <HiStar key={s} size={18} className={s <= Math.round(product.rating) ? 'star-filled' : 'star-empty'} />
                ))}
              </div>
              <span>{product.rating?.toFixed(1)}</span>
              <span className="rating-count">({product.numReviews} reviews)</span>
            </div>

            <div className="detail-price">
              <span className="price-current">${effectivePrice.toLocaleString()}</span>
              {discountPercent > 0 && (
                <>
                  <span className="price-original">${product.price.toLocaleString()}</span>
                  <span className="price-discount-badge">Save {discountPercent}%</span>
                </>
              )}
            </div>

            <p className="detail-desc">{product.description}</p>

            {/* Stock */}
            <div className="detail-stock">
              {product.stock > 0 ? (
                <span className="stock-badge in-stock"><HiOutlineCheck size={14} /> In Stock ({product.stock} available)</span>
              ) : (
                <span className="stock-badge out-of-stock">Out of Stock</span>
              )}
            </div>

            {/* Add to Cart */}
            {product.stock > 0 && (
              <div className="detail-actions">
                <div className="quantity-selector">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(10, product.stock, quantity + 1))}>+</button>
                </div>
                <button className="btn btn-primary btn-lg detail-add-cart" onClick={handleAddToCart}>
                  <HiOutlineShoppingCart size={20} /> Add to Cart
                </button>
                <button className="btn btn-secondary btn-icon" onClick={toggleWishlist} aria-label="Wishlist">
                  {isWishlisted ? <HiHeart size={20} color="#ef4444" /> : <HiOutlineHeart size={20} />}
                </button>
              </div>
            )}

            <div className="detail-shipping">
              <HiOutlineTruck size={18} />
              <span>Free shipping on orders over $500</span>
            </div>

            {/* Specs */}
            {specsEntries.length > 0 && (
              <div className="detail-specs">
                <h3>Specifications</h3>
                <table className="specs-table">
                  <tbody>
                    {specsEntries.map(([key, value]) => (
                      <tr key={key}>
                        <td className="spec-key">{key}</td>
                        <td className="spec-value">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="detail-reviews">
            <h3 className="section-title">Customer Reviews</h3>
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review._id} className="review-card glass-card">
                  <div className="review-header">
                    <div className="review-user">
                      <div className="review-avatar">{review.user?.name?.[0]}</div>
                      <div>
                        <p className="review-name">{review.user?.name}</p>
                        {review.verifiedPurchase && <span className="badge badge-success">Verified Purchase</span>}
                      </div>
                    </div>
                    <div className="review-stars">
                      {[1,2,3,4,5].map((s) => (
                        <HiStar key={s} size={14} className={s <= review.rating ? 'star-filled' : 'star-empty'} />
                      ))}
                    </div>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                  <p className="review-date">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
