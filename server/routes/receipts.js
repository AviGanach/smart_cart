const express  = require('express');
const router   = express.Router();
const upload   = require('../middleware/upload');
const { asyncHandler, userError } = require('../middleware/errorHandler');
const { validateUuid } = require('../middleware/validateUuid');
const { successResponse }  = require('../../shared/types');
const receiptsDb            = require('../db/receiptsDb');
const { processReceipt }    = require('../services/receiptService');

// ── POST /api/receipts/upload ──────────────────────────────────
router.post(
  '/upload',
  upload.array('receipts', 5),           // up to 5 images per receipt
  asyncHandler(async (req, res) => {
    // Support both single (legacy field name 'receipt') and multi-upload
    const files = req.files?.length ? req.files
                : req.file           ? [req.file]
                : [];

    if (!files.length) throw userError('לא נמצא קובץ בבקשה. אנא העלה תמונה או PDF.');

    const { family_id, user_id } = req.body;
    if (!family_id) throw userError('family_id נדרש.');

    // Multiple files are only supported for images; a PDF must be uploaded alone
    if (files.length > 1 && files.some((f) => f.mimetype === 'application/pdf')) {
      throw userError('לא ניתן לשלב PDF עם קבצים נוספים. העלה PDF בנפרד, או השתמש בתמונות בלבד.');
    }

    console.log(`📥 [UPLOAD] ${files.length} file(s) received:`);
    files.forEach((f) => console.log(`   • ${f.filename} (${f.mimetype})`));

    // Use first file's URL as the representative file_url
    const fileUrl = `/uploads/${files[0].filename}`;
    const receipt = await receiptsDb.createReceipt({
      family_id,
      user_id:  user_id || null,
      file_url: fileUrl,
      status:   'pending',
    });

    console.log(`📥 [UPLOAD] Receipt record created: ${receipt.id}`);

    // Run AI processing in background
    processReceipt(receipt.id, files).catch((err) => {
      console.error(`📥 [UPLOAD] Background processing failed for ${receipt.id}:`, err.message);
    });

    res.status(202).json(successResponse({ receiptId: receipt.id, status: 'pending' }));
  })
);

// ── GET /api/receipts ──────────────────────────────────────────
router.get(
  '/',
  validateUuid('family_id'),
  asyncHandler(async (req, res) => {
    const receipts = await receiptsDb.getReceiptsByFamily(req.query.family_id);
    res.json(successResponse(receipts));
  })
);

// ── GET /api/receipts/:id ──────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const receipt = await receiptsDb.getReceiptById(req.params.id);
    if (!receipt) throw userError('קבלה לא נמצאה.', 404);
    res.json(successResponse(receipt));
  })
);

// ── DELETE /api/receipts/:id ───────────────────────────────────
router.delete(
  '/:id',
  validateUuid('id'),
  asyncHandler(async (req, res) => {
    console.log(`🗑️  [DELETE] Deleting receipt: ${req.params.id}`);
    await receiptsDb.deleteReceipt(req.params.id);
    console.log(`🗑️  [DELETE] Receipt deleted successfully`);
    res.json(successResponse({ deleted: true }));
  })
);

module.exports = router;
