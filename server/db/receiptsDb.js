const supabase = require('./supabaseClient');

/**
 * Get all receipts for a family (most recent first)
 */
async function getReceiptsByFamily(familyId) {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      *,
      stores ( id, branch_name, city, store_chains ( name ) ),
      users ( id, name )
    `)
    .eq('family_id', familyId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get a single receipt with its line items
 */
async function getReceiptById(receiptId) {
  const { data: receipt, error: rErr } = await supabase
    .from('receipts')
    .select(`
      *,
      stores ( id, branch_name, city, store_chains ( name ) ),
      users ( id, name )
    `)
    .eq('id', receiptId)
    .single();

  if (rErr) throw rErr;

  const { data: items, error: iErr } = await supabase
    .from('receipt_items')
    .select(`*, products ( id, name, brand, unit, size, categories ( name ) )`)
    .eq('receipt_id', receiptId);

  if (iErr) throw iErr;

  return { ...receipt, items };
}

/**
 * Create a receipt record
 */
async function createReceipt(payload) {
  const { data, error } = await supabase
    .from('receipts')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update receipt fields (e.g., status, store_id, total)
 */
async function updateReceipt(receiptId, updates) {
  const { data, error } = await supabase
    .from('receipts')
    .update(updates)
    .eq('id', receiptId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Insert multiple line items for a receipt
 */
async function insertReceiptItems(items) {
  const { data, error } = await supabase
    .from('receipt_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Delete a receipt and all its items (CASCADE handles items automatically)
 */
async function deleteReceipt(receiptId) {
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', receiptId);

  if (error) throw error;
}

module.exports = {
  getReceiptsByFamily,
  getReceiptById,
  createReceipt,
  updateReceipt,
  insertReceiptItems,
  deleteReceipt,
};
