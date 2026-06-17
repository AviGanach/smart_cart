const BASE_URL = process.env.REACT_APP_API_URL || '';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || 'שגיאת שרת לא ידועה');
  }

  return json.data;
}

// ── Receipts ────────────────────────────────────────────────────

export async function uploadReceipt(familyId, files) {
  // Accept a single File or an array of Files
  const fileList = Array.isArray(files) ? files : [files];

  const form = new FormData();
  form.append('family_id', familyId);
  fileList.forEach((f) => form.append('receipts', f));

  const res = await fetch(`${BASE_URL}/api/receipts/upload`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'שגיאה בהעלאת הקבלה');
  return json.data;
}

export function getReceipts(familyId) {
  return apiFetch(`/api/receipts?family_id=${familyId}`);
}

export function getReceiptById(id) {
  return apiFetch(`/api/receipts/${id}`);
}

export function deleteReceipt(id) {
  return apiFetch(`/api/receipts/${id}`, { method: 'DELETE' });
}

// ── Products ────────────────────────────────────────────────────

export function getProducts({ search, categoryId } = {}) {
  const params = new URLSearchParams();
  if (search)     params.set('search', search);
  if (categoryId) params.set('category_id', categoryId);
  return apiFetch(`/api/products?${params}`);
}

export function getProductPrices(productId) {
  return apiFetch(`/api/products/${productId}/prices`);
}

export function getCategories() {
  return apiFetch('/api/products/meta/categories');
}

export function deleteProduct(id) {
  return apiFetch(`/api/products/${id}`, { method: 'DELETE' });
}

// ── Analytics ───────────────────────────────────────────────────

export function getAnalyticsSummary(familyId) {
  return apiFetch(`/api/analytics/summary?family_id=${familyId}`);
}

export function getAnalyticsByStore(familyId) {
  return apiFetch(`/api/analytics/by-store?family_id=${familyId}`);
}

export function getTopProducts(familyId) {
  return apiFetch(`/api/analytics/top-products?family_id=${familyId}`);
}

export function getWeeklyData(familyId) {
  return apiFetch(`/api/analytics/weekly?family_id=${familyId}`);
}

// ── Stores ──────────────────────────────────────────────────────

export function getStores() {
  return apiFetch('/api/stores');
}
