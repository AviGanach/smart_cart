const express = require('express');
const router  = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { validateUuid } = require('../middleware/validateUuid');
const { successResponse } = require('../../shared/types');
const analyticsDb = require('../db/analyticsDb');

// ── GET /api/analytics/summary ────────────────────────────────
router.get(
  '/summary',
  validateUuid('family_id'),
  asyncHandler(async (req, res) => {
    const data = await analyticsDb.getMonthlySummary(req.query.family_id);
    res.json(successResponse(data));
  })
);

// ── GET /api/analytics/by-store ───────────────────────────────
router.get(
  '/by-store',
  validateUuid('family_id'),
  asyncHandler(async (req, res) => {
    const data = await analyticsDb.getByStore(req.query.family_id);
    res.json(successResponse(data));
  })
);

// ── GET /api/analytics/top-products ───────────────────────────
router.get(
  '/top-products',
  validateUuid('family_id'),
  asyncHandler(async (req, res) => {
    const data = await analyticsDb.getTopProducts(req.query.family_id);
    res.json(successResponse(data));
  })
);

// ── GET /api/analytics/weekly ─────────────────────────────────
router.get(
  '/weekly',
  validateUuid('family_id'),
  asyncHandler(async (req, res) => {
    const data = await analyticsDb.getWeeklyBreakdown(req.query.family_id);
    res.json(successResponse(data));
  })
);

module.exports = router;
