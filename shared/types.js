/**
 * SmartCart – Shared Types & Constants
 * Used by both client and server
 */

// ── Receipt status ─────────────────────────────────────────────
const RECEIPT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
};

// ── Product units ──────────────────────────────────────────────
const PRODUCT_UNITS = {
  ML: 'ml',
  G: 'g',
  UNITS: 'units',
};

// ── Store chains (seed data) ───────────────────────────────────
const KNOWN_STORE_CHAINS = [
  { name: 'רמי לוי' },
  { name: 'שופרסל' },
  { name: 'ויקטורי' },
  { name: 'מגא' },
  { name: 'יינות ביתן' },
  { name: 'חצי חינם' },
  { name: 'קרפור' },
  { name: 'AM:PM' },
];

// ── API response shape ─────────────────────────────────────────
/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {any} data
 * @property {string|null} error
 */
const successResponse = (data) => ({ success: true, data, error: null });
const errorResponse = (error) => ({ success: false, data: null, error });

module.exports = {
  RECEIPT_STATUS,
  PRODUCT_UNITS,
  KNOWN_STORE_CHAINS,
  successResponse,
  errorResponse,
};
