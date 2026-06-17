const express = require('express');
const router  = express.Router();
const { asyncHandler, userError } = require('../middleware/errorHandler');
const { successResponse } = require('../../shared/types');
const productsDb = require('../db/productsDb');

// ── GET /api/products ──────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, category_id } = req.query;
    const products = await productsDb.getProducts({ search, categoryId: category_id });
    res.json(successResponse(products));
  })
);

// ── GET /api/products/:id/prices ───────────────────────────────
router.get(
  '/:id/prices',
  asyncHandler(async (req, res) => {
    const prices = await productsDb.getProductPrices(req.params.id);
    res.json(successResponse(prices));
  })
);

// ── GET /api/products/categories ──────────────────────────────
router.get(
  '/meta/categories',
  asyncHandler(async (req, res) => {
    const cats = await productsDb.getCategories();
    res.json(successResponse(cats));
  })
);

// ── DELETE /api/products/:id ───────────────────────────────────
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    console.log(`🗑️  [PRODUCTS] Deleting product: ${req.params.id}`);
    const result = await productsDb.deleteProduct(req.params.id);
    console.log(`🗑️  [PRODUCTS] Product deleted`);
    res.json(successResponse(result));
  })
);

module.exports = router;
