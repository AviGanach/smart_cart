const express = require('express');
const router  = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { successResponse } = require('../../shared/types');
const { getStores } = require('../db/storesDb');

// ── GET /api/stores ────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const stores = await getStores();
    res.json(successResponse(stores));
  })
);

module.exports = router;
