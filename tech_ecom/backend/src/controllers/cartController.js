// CART CONTROLLER
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

// ─── GET CART ────────────────────────────────────────────────────────────────
export const getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product', 'title slug images price discountPrice brand category stock');

  if (!cart) {
    cart = { items: [], totalItems: 0, subtotal: 0 };
  }

  // Real-time stock validation — flag items that exceed available stock
  const itemsWithStockStatus = cart.items?.map((item) => {
    const product = item.product;
    return {
      ...item.toObject(),
      isAvailable: product ? product.stock > 0 : false,
      maxAvailable: product ? product.stock : 0,
      exceedsStock: product ? item.quantity > product.stock : true,
    };
  }) || [];

  res.status(200).json({
    status: 'success',
    data: {
      cart: {
        _id: cart._id,
        items: itemsWithStockStatus,
        totalItems: cart.totalItems || 0,
        subtotal: cart.subtotal || 0,
      },
    },
  });
});

// ─── ADD ITEM TO CART ────────────────────────────────────────────────────────
export const addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1, variant = null } = req.body;

  // 1. Validate product exists and has stock
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  if (product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock. Only ${product.stock} units available.`,
        409
      )
    );
  }

  // 2. Determine unit price (use discount price if available)
  const unitPrice = product.discountPrice > 0 ? product.discountPrice : product.price;

  // 3. Add item atomically
  const cart = await Cart.addItem(req.user._id, productId, quantity, unitPrice, variant);

  // 4. Populate and return
  await cart.populate('items.product', 'title slug images price discountPrice brand category stock');

  res.status(200).json({
    status: 'success',
    message: 'Item added to cart',
    data: { cart },
  });
});

// ─── UPDATE CART ITEM QUANTITY ────────────────────────────────────────────────
export const updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1 || quantity > 10) {
    return next(new AppError('Quantity must be between 1 and 10.', 400));
  }

  // Validate stock before updating
  const existingCart = await Cart.findOne({ user: req.user._id, 'items._id': itemId });
  if (!existingCart) {
    return next(new AppError('Cart item not found.', 404));
  }

  const cartItem = existingCart.items.id(itemId);
  const product = await Product.findById(cartItem.product);

  if (!product || product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock. Only ${product?.stock || 0} units available.`,
        409
      )
    );
  }

  // Atomic quantity update
  const cart = await Cart.updateItemQuantity(req.user._id, itemId, quantity);
  await cart.populate('items.product', 'title slug images price discountPrice brand category stock');

  res.status(200).json({
    status: 'success',
    message: 'Cart item updated',
    data: { cart },
  });
});

// ─── REMOVE ITEM FROM CART ───────────────────────────────────────────────────
export const removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  // Atomic $pull
  const cart = await Cart.removeItem(req.user._id, itemId);

  if (!cart) {
    return next(new AppError('Cart not found.', 404));
  }

  await cart.populate('items.product', 'title slug images price discountPrice brand category stock');

  res.status(200).json({
    status: 'success',
    message: 'Item removed from cart',
    data: { cart },
  });
});

// ─── CLEAR ENTIRE CART ───────────────────────────────────────────────────────
export const clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.clearCart(req.user._id);

  res.status(200).json({
    status: 'success',
    message: 'Cart cleared',
    data: { cart },
  });
});
