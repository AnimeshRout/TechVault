<p align="center">
  <img src="tech_ecom/public/logo.png" alt="TechVault Logo" width="120" />
</p>

<h1 align="center">🤖 TechVault — Full-Stack E-Commerce Platform</h1>

<p align="center">
  A premium, production-ready e-commerce platform for tech & electronics built with the <strong>MERN stack</strong>.
  <br />
  Features Stripe payments, Google OAuth, real-time inventory, email notifications, and a dedicated admin dashboard.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img src="https://img.shields.io/badge/Node.js-Express%205-green?logo=node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb" />
  <img src="https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" />
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Stripe Integration](#stripe-integration)
- [Email Notifications](#email-notifications)
- [Screenshots](#screenshots)
- [License](#license)

---

## 🔭 Overview

**TechVault** is a full-featured e-commerce platform consisting of three parts:

| Component | Port | Description |
|-----------|------|-------------|
| **Frontend** (Customer Store) | `5175` | React SPA — browse products, manage cart, checkout, orders |
| **Admin Dashboard** | `5176` | React SPA — manage products, orders, users, analytics |
| **Backend API** | `5000` | Express REST API — authentication, payments, CRUD, emails |

---

## ✨ Features

### 🛍️ Customer Features
- **Product Browsing** — Filter by category, brand, price range, rating; search with autocomplete
- **Product Details** — Image gallery, reviews & ratings, stock status, related products
- **Shopping Cart** — Add/remove items, quantity controls, persistent cart (server-synced)
- **Wishlist** — Save products, red heart toggle, synced across pages
- **Checkout** — Multi-step (Address → Review → Payment), coupon codes, saved addresses
- **Stripe Payments** — Redirects to Stripe's hosted checkout page (no inline card form)
- **Cash on Delivery** — Place order now, option to "Pay Now" later via Stripe
- **Order Management** — View order history, download PDF invoices, track status
- **Cancel & Refund** — Cancel orders with auto Stripe refund for paid orders, deleted from DB
- **Profile** — Avatar upload (Cloudinary), edit name/email, change password, manage addresses
- **Delete Account** — Removes all user data (orders, cart, reviews, wishlist) from database
- **Google OAuth** — Sign in with Google (Passport.js)
- **Dark/Light Theme** — Toggle with persistence
- **Responsive Design** — Works on desktop, tablet, and mobile

### 🔧 Admin Features
- **Dashboard** — Revenue analytics, order stats, recent orders overview
- **Product Management** — CRUD products, image upload (Cloudinary), stock management
- **Order Management** — View all orders, update status (Processing → Shipped → Delivered)
- **User Management** — View all users, roles
- **Profile** — Admin avatar upload, password change
- **CSV Export** — Export orders and users as CSV

### 🛡️ Security & Backend
- **JWT Authentication** — Access + Refresh token rotation, HTTP-only cookies
- **MongoDB ACID Transactions** — Atomic order placement with stock decrement
- **Rate Limiting** — Login, registration, checkout endpoints
- **Helmet + CORS** — Security headers, configurable CORS origins
- **Input Validation** — Joi schemas on all endpoints
- **Role-Based Access** — Admin-only routes with `authorize('admin')` middleware
- **Cloudinary** — Image uploads for products and avatars
- **Email Notifications** — Order confirmation, payment success, refund, welcome, password reset

---

## 🛠️ Tech Stack

### Frontend (Customer + Admin)
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 8 | Build tool & dev server |
| React Router 7 | Client-side routing |
| Zustand | State management |
| Framer Motion | Animations & transitions |
| Axios | HTTP client |
| React Hot Toast | Toast notifications |
| React Icons | Icon library (Heroicons) |
| Recharts | Dashboard charts (Admin) |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express 5 | Web framework |
| MongoDB + Mongoose 8 | Database & ODM |
| Stripe | Payment processing |
| Passport.js | Google OAuth2 |
| Nodemailer | Transactional emails |
| Cloudinary | Image hosting |
| PDFKit | Invoice PDF generation |
| JSON Web Tokens | Authentication |
| Bcrypt.js | Password hashing |
| Helmet | Security headers |
| Joi | Request validation |
| Node-Cron | Scheduled jobs |

---

## 📁 Project Structure

```
enerzcloud_ecom/
├── package.json                  # Root — runs all 3 services with concurrently
│
├── tech_ecom/                    # Customer Frontend + Backend
│   ├── index.html
│   ├── public/
│   │   ├── logo.png              # TechVault robot logo
│   │   └── favicon.png
│   ├── src/
│   │   ├── api/axios.js          # Axios instance with interceptors
│   │   ├── components/
│   │   │   ├── layout/           # Navbar, Footer
│   │   │   └── ui/               # ProductCard, etc.
│   │   ├── pages/
│   │   │   ├── Auth/             # Login, Register
│   │   │   ├── HomePage/
│   │   │   ├── ProductsPage/     # Product listing + filters
│   │   │   ├── ProductDetailPage/
│   │   │   ├── CartPage/
│   │   │   ├── CheckoutPage/     # Multi-step checkout
│   │   │   ├── OrdersPage/       # Order history + cancel
│   │   │   ├── WishlistPage/
│   │   │   ├── ProfilePage/      # User profile + settings
│   │   │   └── LegalPages/
│   │   ├── stores/               # Zustand stores
│   │   │   ├── authStore.js
│   │   │   ├── cartStore.js
│   │   │   ├── productStore.js
│   │   │   └── themeStore.js
│   │   ├── index.css             # Design system (CSS variables)
│   │   └── main.jsx
│   │
│   └── backend/
│       ├── package.json
│       ├── .env                  # Environment variables (create this)
│       └── src/
│           ├── server.js         # Express app entry point
│           ├── config/
│           │   ├── db.js         # MongoDB connection
│           │   ├── cloudinary.js
│           │   └── passport.js   # Google OAuth strategy
│           ├── controllers/
│           │   ├── authController.js
│           │   ├── orderController.js
│           │   ├── paymentController.js
│           │   ├── productController.js
│           │   ├── googleAuthController.js
│           │   └── passwordController.js
│           ├── middleware/
│           │   ├── auth.js       # JWT protect middleware
│           │   ├── rbac.js       # Role-based access
│           │   ├── rateLimiter.js
│           │   └── validate.js   # Joi validation wrapper
│           ├── models/
│           │   ├── User.js
│           │   ├── Product.js
│           │   ├── Order.js
│           │   ├── Cart.js
│           │   ├── Review.js
│           │   ├── Coupon.js
│           │   └── ...
│           ├── routes/
│           │   ├── authRoutes.js
│           │   ├── orderRoutes.js
│           │   ├── productRoutes.js
│           │   ├── userRoutes.js
│           │   ├── cartRoutes.js
│           │   ├── reviewRoutes.js
│           │   └── adminRoutes.js
│           ├── services/
│           │   ├── emailService.js    # Nodemailer templates
│           │   ├── invoiceService.js  # PDF invoice generation
│           │   ├── pricingService.js  # Price calculation
│           │   ├── stockService.js    # Stock management
│           │   └── exportService.js   # CSV exports
│           ├── validators/
│           └── utils/
│
└── techy_admin/                  # Admin Dashboard
    ├── index.html
    ├── src/
    │   ├── pages/
    │   │   ├── DashboardPage.jsx
    │   │   ├── ProductsPage.jsx
    │   │   ├── OrdersPage.jsx
    │   │   ├── UsersPage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   └── LoginPage.jsx
    │   ├── components/
    │   │   └── AdminLayout.jsx
    │   ├── stores/authStore.js
    │   └── api/axios.js
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB Atlas** account (or local MongoDB)
- **Stripe** account (test mode)
- **Cloudinary** account (free tier works)
- **Google Cloud Console** project (for OAuth — optional)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/techvault.git
cd techvault

# 2. Install root dependencies (concurrently)
npm install

# 3. Install frontend dependencies
cd tech_ecom
npm install

# 4. Install backend dependencies
cd backend
npm install

# 5. Install admin dependencies
cd ../../techy_admin
npm install

# 6. Go back to root
cd ..
```

---

## 🔐 Environment Variables

Create a `.env` file in `tech_ecom/backend/`:

```env
# ─── Server ───────────────────────────────────────
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5175
ADMIN_URL=http://localhost:5176

# ─── MongoDB ──────────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/techvault

# ─── JWT Secrets ──────────────────────────────────
JWT_ACCESS_SECRET=your_access_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ─── Stripe ───────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # optional, for webhooks

# ─── Cloudinary ───────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ─── Google OAuth (optional) ─────────────────────
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ─── Email (SMTP) ────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_NAME=TechVault
ADMIN_ALERT_EMAIL=admin@yourdomain.com
```

> **Tip:** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password).

---

## ▶️ Running the Project

### Run all 3 services at once (recommended)

```bash
# From the root directory
npm run dev
```

This starts:
- **Backend** on `http://localhost:5000`
- **Frontend** on `http://localhost:5175`
- **Admin** on `http://localhost:5176`

### Run individually

```bash
# Backend
cd tech_ecom/backend && npm run server

# Frontend
cd tech_ecom && npm run dev

# Admin
cd techy_admin && npm run dev
```

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create new account |
| POST | `/login` | Login (returns JWT cookies) |
| POST | `/logout` | Clear auth cookies |
| POST | `/refresh` | Rotate access token |
| GET | `/me` | Get current user profile |
| DELETE | `/me` | Delete account + all data |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password/:token` | Reset password |
| GET | `/google` | Google OAuth login |

### Products (`/api/products`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List products (filter, sort, paginate) |
| GET | `/:id` | Get product details |
| POST | `/` | Create product (admin) |
| PUT | `/:id` | Update product (admin) |
| DELETE | `/:id` | Delete product (admin) |

### Cart (`/api/cart`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user's cart |
| POST | `/` | Add item to cart |
| PUT | `/:itemId` | Update item quantity |
| DELETE | `/:itemId` | Remove item |
| DELETE | `/clear` | Clear entire cart |

### Orders (`/api/orders`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Place new order |
| GET | `/my` | Get user's orders |
| GET | `/:id` | Get single order |
| PUT | `/:id/cancel` | Cancel order (+ auto refund) |
| GET | `/:id/invoice` | Download PDF invoice |
| POST | `/:id/checkout-session` | Create Stripe Checkout Session |
| GET | `/:id/verify-payment` | Verify payment after Stripe redirect |

### Users (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/profile` | Update profile (+ avatar upload) |
| GET | `/wishlist` | Get wishlist |
| POST | `/wishlist` | Add to wishlist |
| DELETE | `/wishlist/:productId` | Remove from wishlist |
| POST | `/address` | Add address |
| DELETE | `/address/:addressId` | Delete address |

### Reviews (`/api/reviews`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/product/:productId` | Get product reviews |
| POST | `/` | Submit review |
| DELETE | `/:id` | Delete review |

---

## 💳 Stripe Integration

TechVault uses **Stripe Checkout Sessions** (hosted payment page):

1. User clicks "Pay" → backend creates a Checkout Session with line items
2. User is **redirected to Stripe's hosted page** (card input handled by Stripe)
3. After payment, Stripe redirects back to `/orders?payment=success&orderId=...`
4. Frontend calls `/verify-payment` → backend confirms with Stripe API → marks order as paid
5. On cancel, if order was paid → automatic **full refund** via Stripe Refunds API

### Testing Payments
Use Stripe test card: `4242 4242 4242 4242` with any future date and any CVC.

### Stripe Dashboard Setup
To customize the checkout page logo/branding, go to:
**[Stripe Dashboard → Settings → Branding](https://dashboard.stripe.com/settings/branding)**

---

## 📧 Email Notifications

Emails are sent for the following events (via Nodemailer with professional HTML templates):

| Event | Email Sent |
|-------|------------|
| Account created | Welcome email |
| Order placed | Order confirmation with details |
| Payment confirmed | Payment success notification |
| Order cancelled (unpaid) | Cancellation email |
| Order cancelled (paid) | Refund notification with amount |
| Order shipped | Shipping notification with tracking |
| Order delivered | Delivery confirmation |
| Password reset | Reset link email |
| Back in stock | Product availability alert |

> If SMTP is not configured, emails are skipped gracefully (logged to console).

---

## 🧪 Seed Data

```bash
# Import sample products
cd tech_ecom/backend
npm run data:import

# Destroy all data
npm run data:destroy
```

---

## 📱 Responsive Design

TechVault is fully responsive:
- **Desktop** — Full grid layouts, hover effects, sidebar navigation
- **Tablet** — Adjusted grid columns, collapsible navigation
- **Mobile** — Single column, bottom navigation, swipe-friendly

---

## 🎨 Design System

The app uses a CSS custom property-based design system (`index.css`) with:
- **Color tokens** — Primary, accent, success, error, warning palettes
- **Spacing scale** — `--space-xs` through `--space-3xl`
- **Typography** — Inter font family, weight scale
- **Border radius** — `--radius-sm` through `--radius-full`
- **Transitions** — `--transition-fast`, `--transition-base`
- **Dark mode** — Full dark theme via `[data-theme="dark"]` selector
- **Glass morphism** — `.glass-card` component with backdrop blur

---

## 📄 License

This project is licensed under the **MIT License**.

---

<p align="center">
  Built with ❤️ by the TechVault Team
</p>
