const supabase = require('./supabaseClient');

/**
 * Get all products (with category info)
 */
async function getProducts({ search, categoryId } = {}) {
  let query = supabase
    .from('products')
    .select('*, categories ( id, name )')
    .order('name');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Get price history for a product across all stores
 */
async function getProductPrices(productId) {
  const { data, error } = await supabase
    .from('receipt_items')
    .select(`
      price,
      unit_price_per_100,
      receipts (
        date,
        stores ( id, branch_name, city, store_chains ( name ) )
      )
    `)
    .eq('product_id', productId)
    .order('receipts(date)', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Find a product by exact or fuzzy name match
 * Returns the best match or null
 */
async function findProductByName(name) {
  if (!name || typeof name !== 'string') return null;

  // First try exact match
  const { data: exact } = await supabase
    .from('products')
    .select('*')
    .ilike('name', name)
    .limit(1);

  if (exact && exact.length > 0) return exact[0];

  // Trigram fuzzy match via RPC (pg_trgm)
  const { data: fuzzy, error } = await supabase.rpc('find_similar_product', {
    search_name: name,
    similarity_threshold: 0.3,
  });

  if (error) {
    console.warn('⚠️  fuzzy search RPC not available, falling back to ilike');
    // Use first two significant words (skip very short ones) to reduce false matches
    const words = name.trim().split(/\s+/).filter((w) => w.length >= 3);
    if (!words.length) return null;

    const { data: fallback } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${words[0]}%`)
      .limit(10);

    if (!fallback?.length) return null;

    // Basic similarity guard: require at least 2 shared words (≥3 chars) between
    // the search name and the candidate name before accepting the match.
    const searchWords = new Set(name.toLowerCase().split(/\s+/).filter((w) => w.length >= 3));
    const best = fallback.find((candidate) => {
      const candidateWords = candidate.name.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
      const shared = candidateWords.filter((w) => searchWords.has(w)).length;
      return shared >= 2;
    });

    return best || null;
  }

  return fuzzy?.[0] || null;
}

/**
 * Create a new product (status defaults to 'needs_review')
 */
async function createProduct(payload) {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...payload, status: 'needs_review' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a product — only if it has no receipt_items
 * Returns { deleted: true } or throws if still referenced
 */
async function deleteProduct(productId) {
  // Check references
  const { count, error: countErr } = await supabase
    .from('receipt_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (countErr) throw countErr;
  if (count > 0) {
    const err = new Error(`מוצר זה מופיע ב-${count} פריטי קבלה ולא ניתן למחוק אותו.`);
    err.statusCode = 409;
    err.isUserFacing = true;
    throw err;
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) throw error;
  return { deleted: true };
}

/**
 * Get all categories
 */
async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

module.exports = {
  getProducts,
  getProductPrices,
  findProductByName,
  createProduct,
  deleteProduct,
  getCategories,
};
