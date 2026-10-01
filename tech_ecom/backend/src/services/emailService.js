/**
 * ============================================================================
 * EMAIL SERVICE — Nodemailer transactional email system
 * ============================================================================
 * Professional HTML email templates matching TechVault branding.
 * Supports: order confirmation, shipped, delivered, refund, password reset,
 *           welcome, back-in-stock, low-stock admin alerts.
 * ============================================================================
 */
import nodemailer from 'nodemailer';

// ─── TRANSPORTER ─────────────────────────────────────────────────────────────
let _transporter;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

// ─── BASE TEMPLATE ───────────────────────────────────────────────────────────
const baseTemplate = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TechVault</title>
<style>
  body { margin:0; padding:0; background:#f4f5f7; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
  .preheader { display:none!important; max-height:0; overflow:hidden; mso-hide:all; }
  .wrapper { max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,0.08); }
  .header { background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding:28px 32px; text-align:center; }
  .header img { height:48px; }
  .header h1 { color:#ffffff; font-size:22px; margin:12px 0 0; font-weight:700; letter-spacing:0.5px; }
  .body { padding:32px; }
  .footer { background:#f8f9fa; padding:24px 32px; text-align:center; border-top:1px solid #e9ecef; }
  .footer p { color:#6c757d; font-size:12px; margin:4px 0; }
  .footer .social a { display:inline-block; margin:0 8px; }
  .footer .social img { width:28px; height:28px; }
  .btn { display:inline-block; padding:14px 36px; background:linear-gradient(135deg,#ef4444,#dc2626); color:#ffffff!important; text-decoration:none; border-radius:8px; font-weight:700; font-size:14px; letter-spacing:0.5px; }
  .btn-secondary { background:linear-gradient(135deg,#6366f1,#4f46e5); }
  .divider { border:none; border-top:1px solid #e9ecef; margin:20px 0; }
  .order-item { display:flex; align-items:flex-start; gap:16px; margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #f0f0f0; }
  .order-item img { width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid #e9ecef; }
  .order-item-info h4 { margin:0 0 4px; font-size:14px; color:#1a1a2e; }
  .order-item-info p { margin:2px 0; font-size:13px; color:#6c757d; }
  .billing-row { display:flex; justify-content:space-between; padding:6px 0; font-size:14px; }
  .billing-row.total { font-weight:700; font-size:16px; color:#1a1a2e; border-top:2px solid #1a1a2e; padding-top:12px; margin-top:8px; }
  .status-bar { display:flex; justify-content:space-between; align-items:center; padding:20px 0; }
  .status-step { text-align:center; flex:1; position:relative; }
  .status-dot { width:24px; height:24px; border-radius:50%; margin:0 auto 6px; border:3px solid #e0e0e0; background:#fff; }
  .status-dot.active { border-color:#10b981; background:#10b981; }
  .status-dot.current { border-color:#6366f1; background:#6366f1; box-shadow:0 0 0 4px rgba(99,102,241,0.2); }
  .status-line { height:3px; background:#e0e0e0; position:absolute; top:12px; left:50%; right:-50%; z-index:0; }
  .status-line.active { background:#10b981; }
  .status-label { font-size:11px; color:#6c757d; margin-top:4px; }
  .status-label.active { color:#10b981; font-weight:600; }
  .status-label.current { color:#6366f1; font-weight:600; }
  .address-box { background:#f8f9fa; border-radius:8px; padding:16px; margin:12px 0; }
  .address-box p { margin:2px 0; font-size:13px; color:#495057; }
  .address-box strong { font-size:14px; color:#1a1a2e; }
  @media (max-width:600px) { .wrapper { margin:0; border-radius:0; } .body { padding:20px; } }
</style>
</head>
<body>
<div class="preheader">${preheader}</div>
<div style="padding:20px;">
<div class="wrapper">
  <div class="header">
    <img src="${process.env.CLIENT_URL || 'http://localhost:5175'}/logo.png" alt="TechVault" style="height:48px;" />
    <h1>The Tech Vault</h1>
  </div>
  <div class="body">
    ${content}
  </div>
  <div class="footer">
    <div class="social" style="margin-bottom:12px;">
      <a href="#"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" /></a>
      <a href="#"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" /></a>
      <a href="#"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" /></a>
    </div>
    <p><strong>The Tech Vault</strong></p>
    <p>Your premium destination for cutting-edge electronics</p>
    <p style="margin-top:8px;font-size:11px;">© ${new Date().getFullYear()} TechVault. All rights reserved.</p>
  </div>
</div>
</div>
</body>
</html>
`;

// ─── ORDER STATUS PROGRESS BAR ───────────────────────────────────────────────
function statusBar(currentStatus) {
  const steps = ['Placed', 'Processing', 'Shipped', 'Delivered'];
  const currentIdx = steps.indexOf(currentStatus);

  return `<div class="status-bar">${steps.map((step, i) => {
    const isActive = i < currentIdx;
    const isCurrent = i === currentIdx;
    const dotClass = isActive ? 'active' : isCurrent ? 'current' : '';
    const labelClass = isActive ? 'active' : isCurrent ? 'current' : '';
    const lineClass = i < steps.length - 1 ? (i < currentIdx ? 'active' : '') : '';
    return `<div class="status-step">
      ${i < steps.length - 1 ? `<div class="status-line ${lineClass}"></div>` : ''}
      <div class="status-dot ${dotClass}"></div>
      <div class="status-label ${labelClass}">${step}</div>
    </div>`;
  }).join('')}</div>`;
}

// ─── ORDER ITEMS HTML ────────────────────────────────────────────────────────
function orderItemsHtml(items) {
  return items.map(item => `
    <div class="order-item">
      <img src="${item.image}" alt="${item.title}" />
      <div class="order-item-info">
        <h4>${item.title}</h4>
        <p>Qty: ${item.quantity}</p>
        <p style="font-weight:600;color:#1a1a2e;">$${item.unitPrice.toFixed(2)}</p>
      </div>
    </div>
  `).join('');
}

// ─── BILLING DETAILS HTML ────────────────────────────────────────────────────
function billingHtml(pricing) {
  return `
    <h3 style="font-size:15px;margin:20px 0 12px;color:#1a1a2e;">Billing Details</h3>
    <div class="billing-row"><span>Sub-total:</span><span>$${pricing.subtotal?.toFixed(2)}</span></div>
    <div class="billing-row"><span>Shipping:</span><span>${pricing.shippingCost === 0 ? 'FREE' : '$' + pricing.shippingCost?.toFixed(2)}</span></div>
    <div class="billing-row"><span>Tax:</span><span>$${pricing.tax?.toFixed(2)}</span></div>
    ${pricing.discount > 0 ? `<div class="billing-row" style="color:#10b981;"><span>Discount:</span><span>-$${pricing.discount?.toFixed(2)}</span></div>` : ''}
    <div class="billing-row total"><span>Grand Total:</span><span>$${pricing.total?.toFixed(2)}</span></div>
  `;
}

// ─── ADDRESS HTML ────────────────────────────────────────────────────────────
function addressHtml(addr) {
  return `
    <div class="address-box">
      <strong>Delivery Address</strong>
      <p>${addr.fullName}</p>
      <p>${addr.street}</p>
      <p>${addr.city}, ${addr.state} ${addr.zipCode}</p>
      <p>${addr.country}</p>
      <p>Contact: ${addr.phone}</p>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function orderConfirmationEmail(order, user) {
  const content = `
    ${statusBar('Placed')}
    <p style="font-size:14px;color:#495057;text-align:center;margin-bottom:24px;">
      <strong>Order ID:</strong> #${order._id.toString().slice(-8).toUpperCase()} | 
      <strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })}
    </p>
    <p style="font-size:15px;color:#1a1a2e;">Hey ${user.name},</p>
    <p style="font-size:14px;color:#495057;">Thank you for your order! We've received it and are getting it ready. You'll receive updates as your order progresses.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${process.env.CLIENT_URL}/orders" class="btn btn-secondary">View Order Details</a>
    </div>
    ${addressHtml(order.shippingAddress)}
    <h3 style="font-size:15px;margin:20px 0 12px;color:#1a1a2e;">Order Summary</h3>
    ${orderItemsHtml(order.orderItems)}
    ${billingHtml(order.pricing)}
    <hr class="divider" />
    <p style="font-size:13px;color:#6c757d;text-align:center;">Have a great day!<br/><strong>The Tech Vault Team</strong></p>
  `;
  return baseTemplate(content, `Your order #${order._id.toString().slice(-8).toUpperCase()} has been placed!`);
}

export function orderShippedEmail(order, user) {
  const content = `
    ${statusBar('Shipped')}
    <p style="font-size:14px;color:#495057;text-align:center;margin-bottom:24px;">
      <strong>Order ID:</strong> #${order._id.toString().slice(-8).toUpperCase()} | 
      <strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })}
    </p>
    <p style="font-size:15px;color:#1a1a2e;">Hey ${user.name},</p>
    <p style="font-size:14px;color:#495057;">Great news! Your order has been shipped and is on its way to you. 🚚</p>
    ${order.trackingNumber ? `<p style="font-size:14px;color:#495057;"><strong>Tracking Number:</strong> ${order.trackingNumber}${order.carrier ? ` (${order.carrier.toUpperCase()})` : ''}</p>` : ''}
    <div style="text-align:center;margin:24px 0;">
      <a href="${process.env.CLIENT_URL}/orders" class="btn">Track Order</a>
    </div>
    ${addressHtml(order.shippingAddress)}
    <h3 style="font-size:15px;margin:20px 0 12px;color:#1a1a2e;">Order Summary</h3>
    ${orderItemsHtml(order.orderItems)}
    <hr class="divider" />
    <p style="font-size:13px;color:#6c757d;text-align:center;">P.S: Don't forget to offer a glass of water to the person delivering your order, they come bearing delightful gifts. 😊</p>
  `;
  return baseTemplate(content, `Your order #${order._id.toString().slice(-8).toUpperCase()} has been shipped!`);
}

export function orderDeliveredEmail(order, user) {
  const content = `
    ${statusBar('Delivered')}
    <p style="font-size:14px;color:#495057;text-align:center;margin-bottom:24px;">
      <strong>Order ID:</strong> #${order._id.toString().slice(-8).toUpperCase()}
    </p>
    <p style="font-size:15px;color:#1a1a2e;">Hey ${user.name},</p>
    <p style="font-size:14px;color:#495057;">Your order has been delivered! 🎉 We hope you love your new tech. If you have any issues, our support team is here to help.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${process.env.CLIENT_URL}/orders" class="btn btn-secondary">Leave a Review</a>
    </div>
    <h3 style="font-size:15px;margin:20px 0 12px;color:#1a1a2e;">What was delivered</h3>
    ${orderItemsHtml(order.orderItems)}
    <hr class="divider" />
    <p style="font-size:13px;color:#6c757d;text-align:center;">Thank you for shopping with us!<br/><strong>The Tech Vault Team</strong></p>
  `;
  return baseTemplate(content, `Your order has been delivered!`);
}

export function orderRefundEmail(order, user, refundAmount) {
  const content = `
    <p style="font-size:15px;color:#1a1a2e;">Hey ${user.name},</p>
    <p style="font-size:14px;color:#495057;">Your refund of <strong>$${refundAmount.toFixed(2)}</strong> for order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> has been processed.</p>
    <p style="font-size:14px;color:#495057;">The refund will appear in your account within 5-10 business days depending on your bank.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${process.env.CLIENT_URL}/orders" class="btn btn-secondary">View Order</a>
    </div>
    <hr class="divider" />
    <p style="font-size:13px;color:#6c757d;text-align:center;">We're sorry to see this return. We hope to serve you better next time.<br/><strong>The Tech Vault Team</strong></p>
  `;
  return baseTemplate(content, `Your refund has been processed`);
}

export function passwordResetEmail(user, resetUrl) {
  const content = `
    <p style="font-size:15px;color:#1a1a2e;">Hey ${user.name},</p>
    <p style="font-size:14px;color:#495057;">We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <p style="font-size:13px;color:#6c757d;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
    <hr class="divider" />
    <p style="font-size:12px;color:#adb5bd;">For security, this link can only be used once.</p>
  `;
  return baseTemplate(content, 'Reset your TechVault password');
}

export function welcomeEmail(user) {
  const content = `
    <p style="font-size:15px;color:#1a1a2e;">Hey ${user.name}! 👋</p>
    <p style="font-size:14px;color:#495057;">Welcome to <strong>The Tech Vault</strong> — your premium destination for cutting-edge electronics and tech gear.</p>
    <p style="font-size:14px;color:#495057;">Here's what you can do:</p>
    <ul style="font-size:14px;color:#495057;padding-left:20px;">
      <li>🛒 Browse 100+ premium tech products</li>
      <li>⭐ Read and write reviews</li>
      <li>❤️ Save favorites to your wishlist</li>
      <li>🚀 Track your orders in real-time</li>
    </ul>
    <div style="text-align:center;margin:24px 0;">
      <a href="${process.env.CLIENT_URL}/products" class="btn">Start Shopping</a>
    </div>
    <hr class="divider" />
    <p style="font-size:13px;color:#6c757d;text-align:center;">Happy shopping!<br/><strong>The Tech Vault Team</strong></p>
  `;
  return baseTemplate(content, 'Welcome to TechVault!');
}

export function emailVerificationEmail(user, verifyUrl) {
  const content = `
    <p style="font-size:15px;color:#1a1a2e;">Hey ${user.name},</p>
    <p style="font-size:14px;color:#495057;">Please verify your email address to complete your registration and unlock all features.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${verifyUrl}" class="btn btn-secondary">Verify Email</a>
    </div>
    <p style="font-size:13px;color:#6c757d;">This link expires in 24 hours.</p>
  `;
  return baseTemplate(content, 'Verify your TechVault email');
}

export function backInStockEmail(user, product) {
  const content = `
    <p style="font-size:15px;color:#1a1a2e;">Hey ${user.name || user.email},</p>
    <p style="font-size:14px;color:#495057;">Great news! <strong>${product.title}</strong> is back in stock. Grab it before it's gone again!</p>
    <div style="text-align:center;margin:16px 0;">
      <img src="${product.images?.[0]}" alt="${product.title}" style="max-width:200px;border-radius:8px;border:1px solid #e9ecef;" />
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="${process.env.CLIENT_URL}/product/${product.slug}" class="btn">Buy Now — $${product.price}</a>
    </div>
  `;
  return baseTemplate(content, `${product.title} is back in stock!`);
}

// ─── SEND EMAIL FUNCTION ─────────────────────────────────────────────────────
export async function sendEmail({ to, subject, html }) {
  // Skip sending if SMTP is not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`📧 [EMAIL SKIPPED — No SMTP config] To: ${to} | Subject: ${subject}`);
    return { skipped: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.FROM_NAME || 'TechVault'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 [EMAIL SENT] To: ${to} | Subject: ${subject} | ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`📧 [EMAIL FAILED] To: ${to} | Subject: ${subject} | Error: ${err.message}`);
    // Don't throw — email failure shouldn't crash the request
    return { error: err.message };
  }
}
