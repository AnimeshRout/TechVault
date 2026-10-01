/**
 * Legal Pages — Privacy Policy, Terms of Service, Returns Policy, FAQ, Contact
 * Shared layout with sidebar navigation between legal sections
 */
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../../components/ui/SEO';
import './LegalPages.css';

const pages = {
  privacy: {
    title: 'Privacy Policy',
    seo: 'How TechVault collects, uses, and protects your personal information.',
    content: () => (
      <>
        <p className="legal-updated">Last updated: September 2026</p>
        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly when you create an account, place an order, or contact us. This includes your name, email address, shipping address, phone number, and payment information.</p>
        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>Process and fulfill your orders</li>
          <li>Send order confirmations and shipping updates</li>
          <li>Respond to customer service requests</li>
          <li>Improve our website and services</li>
          <li>Send promotional emails (with your consent)</li>
        </ul>
        <h2>3. Information Sharing</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul>
          <li><strong>Payment processors</strong> (Stripe) to complete transactions</li>
          <li><strong>Shipping carriers</strong> to deliver your orders</li>
          <li><strong>Analytics services</strong> to improve our website</li>
        </ul>
        <h2>4. Data Security</h2>
        <p>We implement industry-standard security measures including SSL encryption, secure httpOnly cookies, and bcrypt password hashing to protect your data.</p>
        <h2>5. Cookies</h2>
        <p>We use essential cookies for authentication and cart functionality. No third-party tracking cookies are used without your consent.</p>
        <h2>6. Your Rights</h2>
        <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at privacy@techvault.com.</p>
        <h2>7. Contact</h2>
        <p>For privacy-related inquiries, email us at <strong>privacy@techvault.com</strong>.</p>
      </>
    ),
  },
  terms: {
    title: 'Terms of Service',
    seo: 'TechVault terms and conditions governing your use of our website and services.',
    content: () => (
      <>
        <p className="legal-updated">Last updated: September 2026</p>
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using TechVault, you agree to be bound by these Terms of Service. If you do not agree, do not use our services.</p>
        <h2>2. Account Responsibilities</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
        <h2>3. Product Information</h2>
        <p>We strive for accuracy in product descriptions and pricing. However, we reserve the right to correct errors and update information without notice.</p>
        <h2>4. Orders & Payment</h2>
        <ul>
          <li>All prices are in USD and subject to applicable taxes</li>
          <li>We reserve the right to cancel orders due to pricing errors or stock issues</li>
          <li>Payment is processed securely through Stripe</li>
        </ul>
        <h2>5. Shipping</h2>
        <p>Free shipping on orders over $100. Standard shipping typically takes 5-7 business days. Express options are available at checkout.</p>
        <h2>6. Limitation of Liability</h2>
        <p>TechVault shall not be liable for indirect, incidental, or consequential damages arising from the use of our services.</p>
        <h2>7. Changes to Terms</h2>
        <p>We may update these terms at any time. Continued use after changes constitutes acceptance of new terms.</p>
      </>
    ),
  },
  returns: {
    title: 'Returns & Refund Policy',
    seo: 'TechVault return and refund policy. Easy 30-day returns on all products.',
    content: () => (
      <>
        <p className="legal-updated">Last updated: September 2026</p>
        <h2>30-Day Return Policy</h2>
        <p>We accept returns within 30 days of delivery for a full refund. Items must be in original condition with all packaging and accessories.</p>
        <h2>How to Initiate a Return</h2>
        <ol>
          <li>Go to <strong>My Orders</strong> and find the delivered order</li>
          <li>Click <strong>"Return"</strong> and select the items to return</li>
          <li>Provide a reason for the return</li>
          <li>Our team will review and approve your request within 24 hours</li>
          <li>Ship the item back using the provided return label</li>
        </ol>
        <h2>Refund Process</h2>
        <ul>
          <li>Refunds are processed within 5-7 business days after we receive the returned item</li>
          <li>Refunds are issued to the original payment method</li>
          <li>Shipping costs are refunded for defective or incorrect items</li>
        </ul>
        <h2>Non-Returnable Items</h2>
        <ul>
          <li>Items damaged by the customer</li>
          <li>Items without original packaging</li>
          <li>Opened software or digital products</li>
        </ul>
        <h2>Exchanges</h2>
        <p>We currently do not offer direct exchanges. Please return the item and place a new order.</p>
      </>
    ),
  },
  faq: {
    title: 'Frequently Asked Questions',
    seo: 'Common questions about shopping at TechVault, shipping, returns, and more.',
    content: () => (
      <>
        <div className="faq-item">
          <h3>How do I track my order?</h3>
          <p>Once your order ships, you'll receive an email with tracking information. You can also check your order status in <strong>My Orders</strong>.</p>
        </div>
        <div className="faq-item">
          <h3>What payment methods do you accept?</h3>
          <p>We accept Cash on Delivery and Credit/Debit cards via Stripe. More payment options coming soon.</p>
        </div>
        <div className="faq-item">
          <h3>Is free shipping available?</h3>
          <p>Yes! Orders over $100 qualify for free standard shipping. Express shipping is available at additional cost.</p>
        </div>
        <div className="faq-item">
          <h3>How do I return a product?</h3>
          <p>Visit your <strong>My Orders</strong> page, find the delivered order, and click "Return". See our <Link to="/legal/returns">Returns Policy</Link> for full details.</p>
        </div>
        <div className="faq-item">
          <h3>Are products covered by warranty?</h3>
          <p>All products carry manufacturer warranties. Duration varies by product and brand. Contact us for warranty claims.</p>
        </div>
        <div className="faq-item">
          <h3>Can I cancel my order?</h3>
          <p>Orders can be cancelled before they are shipped. Once shipped, you'll need to initiate a return instead.</p>
        </div>
        <div className="faq-item">
          <h3>How do I use a coupon code?</h3>
          <p>Enter your coupon code in the checkout page under "Order Summary". Click "Apply" to see your discount.</p>
        </div>
        <div className="faq-item">
          <h3>Is my payment information secure?</h3>
          <p>Yes. All payments are processed through Stripe with PCI-DSS Level 1 compliance. We never store your card details.</p>
        </div>
      </>
    ),
  },
  contact: {
    title: 'Contact Us',
    seo: 'Get in touch with TechVault customer support. We\'re here to help.',
    content: () => (
      <>
        <h2>We'd love to hear from you</h2>
        <p>Our customer support team is available Monday–Friday, 9 AM – 6 PM EST.</p>
        <div className="contact-methods">
          <div className="contact-card">
            <span className="contact-icon">📧</span>
            <h3>Email</h3>
            <p>support@techvault.com</p>
            <p className="contact-note">Response within 24 hours</p>
          </div>
          <div className="contact-card">
            <span className="contact-icon">💬</span>
            <h3>Live Chat</h3>
            <p>Available on our website</p>
            <p className="contact-note">Mon–Fri, 9 AM – 6 PM EST</p>
          </div>
          <div className="contact-card">
            <span className="contact-icon">📍</span>
            <h3>Office</h3>
            <p>TechVault HQ</p>
            <p className="contact-note">San Francisco, CA 94105</p>
          </div>
        </div>
      </>
    ),
  },
};

const navItems = [
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms of Service' },
  { key: 'returns', label: 'Returns Policy' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Contact Us' },
];

export default function LegalPages() {
  const { page } = useParams();
  const currentPage = pages[page];

  if (!currentPage) return <Navigate to="/legal/privacy" replace />;

  const Content = currentPage.content;

  return (
    <div className="legal-page">
      <SEO title={currentPage.title} description={currentPage.seo} />
      <div className="container">
        <div className="legal-layout">
          {/* Sidebar Navigation */}
          <aside className="legal-sidebar glass-card">
            <h3>Legal & Help</h3>
            <nav className="legal-nav">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  to={`/legal/${item.key}`}
                  className={`legal-nav-item ${page === item.key ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <motion.main
            className="legal-content glass-card"
            key={page}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1>{currentPage.title}</h1>
            <Content />
          </motion.main>
        </div>
      </div>
    </div>
  );
}
