// PRICING SERVICE — Tax, Shipping, and Discount Engine

// ─── TAX RATES BY STATE ──────────────────────────────────────────────────────
const STATE_TAX_RATES = {
  'AL': 0.04, 'AK': 0.00, 'AZ': 0.056, 'AR': 0.065, 'CA': 0.0725,
  'CO': 0.029, 'CT': 0.0635, 'DE': 0.00, 'FL': 0.06, 'GA': 0.04,
  'HI': 0.04, 'ID': 0.06, 'IL': 0.0625, 'IN': 0.07, 'IA': 0.06,
  'KS': 0.065, 'KY': 0.06, 'LA': 0.0445, 'ME': 0.055, 'MD': 0.06,
  'MA': 0.0625, 'MI': 0.06, 'MN': 0.06875, 'MS': 0.07, 'MO': 0.04225,
  'MT': 0.00, 'NE': 0.055, 'NV': 0.0685, 'NH': 0.00, 'NJ': 0.06625,
  'NM': 0.05125, 'NY': 0.04, 'NC': 0.0475, 'ND': 0.05, 'OH': 0.0575,
  'OK': 0.045, 'OR': 0.00, 'PA': 0.06, 'RI': 0.07, 'SC': 0.06,
  'SD': 0.045, 'TN': 0.07, 'TX': 0.0625, 'UT': 0.061, 'VT': 0.06,
  'VA': 0.053, 'WA': 0.065, 'WV': 0.06, 'WI': 0.05, 'WY': 0.04,
  'DC': 0.06,
};

const DEFAULT_TAX_RATE = 0.08; // 8% fallback for international

// ─── SHIPPING TIERS ──────────────────────────────────────────────────────────
const SHIPPING_CONFIG = {
  freeShippingThreshold: 100, // Orders above $100 get free shipping
  tiers: [
    { maxSubtotal: 25, cost: 9.99, label: 'Standard Shipping' },
    { maxSubtotal: 50, cost: 7.99, label: 'Standard Shipping' },
    { maxSubtotal: 100, cost: 4.99, label: 'Reduced Shipping' },
  ],
  defaultCost: 4.99,
};

/**
 * Calculate tax based on shipping state
 * @param {number} subtotal - Order subtotal (after discounts)
 * @param {string} state - Two-letter state code (or country for non-US)
 * @returns {{ tax: number, taxRate: number }}
 */
export function calculateTax(subtotal, state = '') {
  const stateCode = state?.toUpperCase()?.trim();
  const taxRate = STATE_TAX_RATES[stateCode] ?? DEFAULT_TAX_RATE;
  const tax = Math.round(subtotal * taxRate * 100) / 100;

  return { tax, taxRate };
}

/**
 * Calculate shipping cost based on subtotal
 * @param {number} subtotal
 * @returns {{ shippingCost: number, isFreeShipping: boolean }}
 */
export function calculateShipping(subtotal) {
  if (subtotal >= SHIPPING_CONFIG.freeShippingThreshold) {
    return { shippingCost: 0, isFreeShipping: true };
  }

  const tier = SHIPPING_CONFIG.tiers.find((t) => subtotal <= t.maxSubtotal);
  const shippingCost = tier ? tier.cost : SHIPPING_CONFIG.defaultCost;

  return { shippingCost, isFreeShipping: false };
}

/**
 * Calculate full order pricing
 * @param {number} subtotal - Sum of (unitPrice * quantity) for all items
 * @param {string} state - Shipping state code
 * @param {number} discount - Coupon discount amount
 * @returns {Object} Full pricing breakdown
 */
export function calculateOrderPricing(subtotal, state = '', discount = 0) {
  // Apply discount to subtotal
  const discountedSubtotal = Math.max(0, subtotal - discount);

  // Calculate shipping on original subtotal (free shipping threshold uses original)
  const { shippingCost, isFreeShipping } = calculateShipping(subtotal);

  // Calculate tax on discounted subtotal
  const { tax, taxRate } = calculateTax(discountedSubtotal, state);

  // Grand total
  const total = Math.round((discountedSubtotal + shippingCost + tax) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    shippingCost,
    isFreeShipping,
    tax,
    taxRate,
    total,
  };
}

// Export config for frontend display
export const PRICING_CONFIG = {
  freeShippingThreshold: SHIPPING_CONFIG.freeShippingThreshold,
  defaultTaxRate: DEFAULT_TAX_RATE,
};
