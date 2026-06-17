const path = require('path');
const { extractReceiptData }  = require('../ai/extractReceipt');
const receiptsDb              = require('../db/receiptsDb');
const { findOrCreateStore }   = require('../db/storesDb');
const { findProductByName, createProduct } = require('../db/productsDb');
const { RECEIPT_STATUS }      = require('../../shared/types');

/**
 * Full receipt processing pipeline:
 * 1. AI extraction
 * 2. Store lookup/create
 * 3. Per-item product lookup/create
 * 4. Calculate unit_price_per_100
 * 5. Save everything to DB
 */
/**
 * @param {string} receiptId
 * @param {Array<{path: string, mimetype: string}>} files  – multer file objects (or a single one)
 */
async function processReceipt(receiptId, files) {
  // Normalise legacy single-file call: processReceipt(id, filePath, mimeType)
  if (typeof files === 'string') {
    files = [{ path: files, mimetype: arguments[2] }];
  }
  if (!Array.isArray(files)) files = [files];

  console.log(`\n📄 [RECEIPT] Starting processing pipeline for receipt ${receiptId} (${files.length} file(s))`);

  // ── Step 1: Mark as processing ──────────────────────────────
  await receiptsDb.updateReceipt(receiptId, { status: RECEIPT_STATUS.PROCESSING });
  console.log(`📄 [RECEIPT] Status → processing`);

  // Map multer objects → { filePath, mimeType }
  const fileArgs = files.map((f) => ({ filePath: f.path, mimeType: f.mimetype }));

  let extracted;
  try {
    extracted = await extractReceiptData(fileArgs);
  } catch (aiError) {
    console.error(`📄 [RECEIPT] AI extraction failed:`, aiError.message);
    await receiptsDb.updateReceipt(receiptId, {
      status: RECEIPT_STATUS.ERROR,
      raw_text: aiError.message,
    });
    throw aiError;
  }

  // ── Sanity-check the extracted date ────────────────────────
  extracted.date = sanitizeReceiptDate(extracted.date);
  console.log(`📄 [RECEIPT] AI extraction complete. Store: "${extracted.store_name}", Date: ${extracted.date}, Total: ₪${extracted.total}`);

  // ── Step 2: Find or create store ────────────────────────────
  let storeId = null;
  if (extracted.store_name) {
    try {
      const store = await findOrCreateStore({
        chainName: extracted.store_name,
        city: null,
        branchName: null,
      });
      storeId = store.id;
      console.log(`📄 [RECEIPT] Store resolved: ${store.id}`);
    } catch (err) {
      console.warn(`📄 [RECEIPT] Could not resolve store:`, err.message);
    }
  }

  // ── Step 3: Update receipt with store + date + total ────────
  await receiptsDb.updateReceipt(receiptId, {
    store_id: storeId,
    date:     extracted.date || new Date().toISOString().split('T')[0],
    total:    extracted.total || 0,
    raw_text: JSON.stringify(extracted),
  });

  // ── Step 4: Process items ───────────────────────────────────
  // Filter out items with no name (Gemini returned null for unrecognised lines)
  const validItems = (extracted.items || []).filter((item) => {
    if (!item.name || typeof item.name !== 'string') {
      console.warn(`   ⚠️  Skipping item with null/missing name:`, JSON.stringify(item));
      return false;
    }
    return true;
  });

  console.log(`📄 [RECEIPT] Processing ${validItems.length} valid line items (${(extracted.items?.length || 0) - validItems.length} skipped)...`);
  const receiptItems = [];

  for (const item of validItems) {
    console.log(`   🔍 [${item.barcode || 'no-barcode'}] Looking up: "${item.name}"`);

    let product = await findProductByName(item.name);

    if (!product) {
      console.log(`   ➕ Creating new product: "${item.name}"`);
      try {
        product = await createProduct({
          name:  item.name,
          brand: null,
          unit:  item.unit || 'units',
          size:  null,
        });
      } catch (e) {
        console.warn(`   ⚠️  Could not create product "${item.name}":`, e.message);
      }
    } else {
      console.log(`   ✅ Found product: ${product.id}`);
    }

    const unitPer100 = calcUnitPer100(item.price, item.qty, product, item.unit);

    receiptItems.push({
      receipt_id:         receiptId,
      product_id:         product?.id || null,
      qty:                item.qty || 1,
      price:              item.price || 0,
      unit_price_per_100: unitPer100,
      raw_name:           item.name,
    });
  }

  // ── Step 5: Insert items + mark done ────────────────────────
  if (receiptItems.length > 0) {
    await receiptsDb.insertReceiptItems(receiptItems);
    console.log(`📄 [RECEIPT] Saved ${receiptItems.length} items`);
  } else {
    console.warn(`📄 [RECEIPT] No items to save — receipt will be marked done with 0 items`);
  }

  await receiptsDb.updateReceipt(receiptId, { status: RECEIPT_STATUS.DONE });
  console.log(`📄 [RECEIPT] ✅ Pipeline complete – receipt ${receiptId} is DONE\n`);

  return receiptId;
}

/**
 * Fix dates where the AI mis-read the year (common with Israeli DD/MM/YY format).
 * If the date is more than 12 months in the past, try replacing the year with
 * the current year. If that would put it in the future, use current year - 1.
 * Falls back to today if the date is missing or unparseable.
 */
function sanitizeReceiptDate(dateStr) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  if (!dateStr) return todayStr;

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    console.warn(`📄 [DATE] Unparseable date "${dateStr}" – using today`);
    return todayStr;
  }

  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setFullYear(today.getFullYear() - 1);

  if (parsed >= twelveMonthsAgo) return dateStr; // date looks fine

  // Year looks wrong — try replacing with current year
  console.warn(`📄 [DATE] Suspicious date "${dateStr}" (>12 months ago) – correcting year`);
  const corrected = new Date(parsed);
  corrected.setFullYear(today.getFullYear());

  if (corrected > today) corrected.setFullYear(today.getFullYear() - 1);

  const fixed = `${corrected.getFullYear()}-${String(corrected.getMonth()+1).padStart(2,'0')}-${String(corrected.getDate()).padStart(2,'0')}`;
  console.warn(`📄 [DATE] Corrected: "${dateStr}" → "${fixed}"`);
  return fixed;
}

/**
 * Calculate price per 100g or 100ml.
 *
 * Two cases:
 * 1. Weighted item (unit="g"): qty IS the total weight in grams → price/qty*100
 * 2. Packaged item (unit="units"/"ml"): use product.size (fixed package size)
 */
function calcUnitPer100(price, qty, product, itemUnit) {
  if (!price || !qty || qty === 0) return null;

  // Weighted items sold by the gram (meat, vegetables, fish, open deli)
  if (itemUnit === 'g') {
    return Math.round((price / qty) * 100 * 10000) / 10000;
  }

  // Packaged liquid items where we know the volume in ml
  if (itemUnit === 'ml' && product?.size) {
    const totalMl = product.size * qty;
    return Math.round((price / totalMl) * 100 * 10000) / 10000;
  }

  // Packaged items with a known weight (product.size in g or ml)
  if (product?.size && product.unit !== 'units') {
    const totalSize = product.size * qty;
    if (totalSize === 0) return null;
    return Math.round((price / totalSize) * 100 * 10000) / 10000;
  }

  return null;
}

module.exports = { processReceipt };
