import { Link } from 'react-router-dom';
import { HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';
import './Footer.css';

const categories = [
  { slug: 'mobiles', label: 'Mobiles' },
  { slug: 'laptops', label: 'Laptops' },
  { slug: 'tablets', label: 'Tablets' },
  { slug: 'audio', label: 'Audio' },
  { slug: 'pc-components', label: 'PC Components' },
  { slug: 'gaming-gear', label: 'Gaming Gear' },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img src="/logo.png" alt="TechVault" className="logo-img" />
              <span className="logo-text">TechVault</span>
            </Link>
            <p className="footer-desc">
              Premium tech & electronics store. Shop the latest mobiles, laptops, audio gear, and gaming peripherals with fast, secure shipping.
            </p>
            <div className="footer-social">
              <a href="#" className="social-link" aria-label="GitHub"><FaGithub size={18} /></a>
              <a href="#" className="social-link" aria-label="LinkedIn"><FaLinkedin size={18} /></a>
              <a href="#" className="social-link" aria-label="Twitter"><FaTwitter size={18} /></a>
            </div>
          </div>

          {/* Categories */}
          <div className="footer-section">
            <h4 className="footer-heading">Categories</h4>
            <ul className="footer-links">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link to={`/products?category=${cat.slug}`}>{cat.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="footer-section">
            <h4 className="footer-heading">My Account</h4>
            <ul className="footer-links">
              <li><Link to="/profile">Profile</Link></li>
              <li><Link to="/orders">Order History</Link></li>
              <li><Link to="/wishlist">Wishlist</Link></li>
              <li><Link to="/cart">Shopping Cart</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-section">
            <h4 className="footer-heading">Contact Us</h4>
            <ul className="footer-links contact-links">
              <li>
                <HiOutlineMail size={16} />
                <span>support@techvault.com</span>
              </li>
              <li>
                <HiOutlinePhone size={16} />
                <span>+1 (555) 123-4567</span>
              </li>
            </ul>
          </div>

          {/* Help & Legal */}
          <div className="footer-section">
            <h4 className="footer-heading">Help & Legal</h4>
            <ul className="footer-links">
              <li><Link to="/legal/faq">FAQ</Link></li>
              <li><Link to="/legal/returns">Returns Policy</Link></li>
              <li><Link to="/legal/privacy">Privacy Policy</Link></li>
              <li><Link to="/legal/terms">Terms of Service</Link></li>
              <li><Link to="/legal/contact">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} TechVault. All rights reserved. Built with ❤️</p>
          <div className="footer-bottom-links">
            <Link to="/legal/privacy">Privacy</Link>
            <span>·</span>
            <Link to="/legal/terms">Terms</Link>
            <span>·</span>
            <Link to="/legal/returns">Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
