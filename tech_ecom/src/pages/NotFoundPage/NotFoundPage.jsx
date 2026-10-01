import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineHome, HiOutlineSearch } from 'react-icons/hi';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="notfound-page">
      <div className="notfound-bg-effects">
        <div className="notfound-orb notfound-orb-1" />
        <div className="notfound-orb notfound-orb-2" />
      </div>

      <motion.div
        className="notfound-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-description">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="notfound-actions">
          <Link to="/" className="btn btn-primary btn-lg">
            <HiOutlineHome size={20} />
            Go Home
          </Link>
          <Link to="/products" className="btn btn-ghost btn-lg">
            <HiOutlineSearch size={20} />
            Browse Products
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
