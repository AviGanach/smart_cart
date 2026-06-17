const supabase = require('./supabaseClient');

/**
 * Monthly totals for summary (current month + previous)
 */
async function getMonthlySummary(familyId) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth() + 1; // 1-based
  // Build date strings directly — avoids UTC conversion shifting the day
  const thisMonthStart = `${y}-${String(m).padStart(2,'0')}-01`;
  const prevY          = m === 1 ? y - 1 : y;
  const prevM          = m === 1 ? 12 : m - 1;
  const prevMonthStart = `${prevY}-${String(prevM).padStart(2,'0')}-01`;
  const prevMonthEnd   = `${y}-${String(m).padStart(2,'0')}-01`; // exclusive upper bound handled by lt

  const [thisMonth, prevMonth] = await Promise.all([
    supabase
      .from('receipts')
      .select('total')
      .eq('family_id', familyId)
      .eq('status', 'done')
      .gte('date', thisMonthStart),

    supabase
      .from('receipts')
      .select('total')
      .eq('family_id', familyId)
      .eq('status', 'done')
      .gte('date', prevMonthStart)
      .lt('date', prevMonthEnd),   // prevMonthEnd = first day of this month (exclusive)
  ]);

  if (thisMonth.error) throw thisMonth.error;
  if (prevMonth.error) throw prevMonth.error;

  const sumTotal = (rows) => rows.reduce((sum, r) => sum + (r.total || 0), 0);

  return {
    thisMonth:    { total: sumTotal(thisMonth.data), from: thisMonthStart },
    prevMonth:    { total: sumTotal(prevMonth.data), from: prevMonthStart, to: prevMonthEnd },
    receiptCount: thisMonth.data?.length ?? 0,   // same filtered rows — no extra query needed
  };
}

/**
 * Weekly spending breakdown for the current month
 */
async function getWeeklyBreakdown(familyId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const monthStart = `${y}-${String(m).padStart(2,'0')}-01`;

  const { data, error } = await supabase
    .from('receipts')
    .select('date, total')
    .eq('family_id', familyId)
    .eq('status', 'done')
    .gte('date', monthStart)
    .order('date');

  if (error) throw error;

  // Group by ISO week
  const weeks = {};
  for (const r of data) {
    const d = new Date(r.date);
    const week = `שבוע ${getWeekOfMonth(d)}`;
    weeks[week] = (weeks[week] || 0) + (r.total || 0);
  }

  return Object.entries(weeks).map(([week, total]) => ({ week, total: Math.round(total * 100) / 100 }));
}

/**
 * Spending breakdown by store
 */
async function getByStore(familyId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const monthStart = `${y}-${String(m).padStart(2,'0')}-01`;

  const { data, error } = await supabase
    .from('receipts')
    .select(`
      total,
      stores ( store_chains ( name ) )
    `)
    .eq('family_id', familyId)
    .eq('status', 'done')
    .gte('date', monthStart);

  if (error) throw error;

  const byStore = {};
  for (const r of data) {
    const name = r.stores?.store_chains?.name || 'לא ידוע';
    byStore[name] = (byStore[name] || 0) + (r.total || 0);
  }

  return Object.entries(byStore)
    .map(([store, total]) => ({ store, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Top products – most expensive / most purchased this month
 */
async function getTopProducts(familyId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const monthStart = `${y}-${String(m).padStart(2,'0')}-01`;

  const { data, error } = await supabase
    .from('receipt_items')
    .select(`
      price,
      qty,
      products ( id, name, brand ),
      receipts!inner ( family_id, date, status )
    `)
    .eq('receipts.family_id', familyId)
    .eq('receipts.status', 'done')
    .gte('receipts.date', monthStart);

  if (error) throw error;

  const productMap = {};
  for (const item of data) {
    const key = item.products?.id;
    if (!key) continue;
    if (!productMap[key]) {
      productMap[key] = {
        id: key,
        name: item.products.name,
        brand: item.products.brand,
        totalSpent: 0,
        totalQty: 0,
      };
    }
    // item.price is already the full line total — do NOT multiply by qty again
    productMap[key].totalSpent += item.price || 0;
    // For weighted items (unit=g), qty is grams — count as 1 purchase instead
    const countableQty = (item.qty > 100) ? 1 : (item.qty || 1);
    productMap[key].totalQty  += countableQty;
  }

  const products = Object.values(productMap);

  return {
    mostExpensive: [...products].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5),
    mostPurchased: [...products].sort((a, b) => b.totalQty  - a.totalQty).slice(0, 5),
  };
}

// Helper: week number within a month (1-based)
function getWeekOfMonth(date) {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + startOfMonth.getDay()) / 7);
}

module.exports = {
  getMonthlySummary,
  getWeeklyBreakdown,
  getByStore,
  getTopProducts,
};
