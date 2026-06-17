import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useFetch } from '../hooks/useFetch';
import { getProducts, getProductPrices, getCategories, deleteProduct } from '../services/api';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency, formatDate } from '../utils/formatters';
import './Products.css';

export default function Products() {
  const [search,   setSearch]   = useState('');
  const [catId,    setCatId]    = useState('');
  const [selected,    setSelected]    = useState(null);
  const [prices,      setPrices]      = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [deletingId,  setDeletingId]  = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const cats = useFetch(getCategories, []);
  const { data: products, loading, error, refetch } = useFetch(
    () => getProducts({ search, categoryId: catId || undefined }),
    [search, catId]
  );

  const handleDelete = async (e, product) => {
    e.stopPropagation(); // don't open the price drawer
    setDeleteError(null);
    if (!window.confirm(`למחוק את "${product.name}"? פעולה זו אינה ניתנת לביטול.`)) return;
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      if (selected?.id === product.id) { setSelected(null); setPrices(null); }
      refetch();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = async (product) => {
    if (selected?.id === product.id) { setSelected(null); setPrices(null); return; }
    setSelected(product);
    setPriceLoading(true);
    try {
      const data = await getProductPrices(product.id);
      setPrices(buildChartData(data));
    } catch (e) {
      setPrices([]);
    } finally {
      setPriceLoading(false);
    }
  };

  return (
    <div className="products-page">
      <h2 className="section-title">מוצרים</h2>

      {/* Search & filter */}
      <div className="filters-row">
        <input
          className="search-input"
          type="text"
          placeholder="🔍 חיפוש מוצר..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="cat-select"
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
        >
          <option value="">כל הקטגוריות</option>
          {(cats.data || []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Product grid */}
      {deleteError && <ErrorMessage message={deleteError} onRetry={() => setDeleteError(null)} />}

      {loading ? <Loader text="מחפש מוצרים..." /> :
       error   ? <ErrorMessage message={error} onRetry={refetch} /> : (
        <div className="products-grid">
          {(products || []).length === 0 && (
            <p className="empty-msg">לא נמצאו מוצרים.</p>
          )}
          {(products || []).map((p) => (
            <div
              key={p.id}
              className={`product-card ${selected?.id === p.id ? 'selected' : ''}`}
              onClick={() => handleSelect(p)}
            >
              <p className="product-name">{p.name}</p>
              {p.brand && <p className="product-brand">{p.brand}</p>}
              <p className="product-meta">
                {p.categories?.name || '—'} · {p.unit} {p.size ? `(${p.size})` : ''}
              </p>
              <button
                className="product-delete-btn"
                onClick={(e) => handleDelete(e, p)}
                disabled={deletingId === p.id}
                title="מחק מוצר"
              >
                {deletingId === p.id ? '⏳' : '🗑️'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Price history drawer */}
      {selected && (
        <div className="price-drawer">
          <div className="drawer-header">
            <h3>📈 היסטוריית מחירים – {selected.name}</h3>
            <button className="close-btn" onClick={() => { setSelected(null); setPrices(null); }}>✕</button>
          </div>
          {priceLoading ? <Loader text="טוען מחירים..." /> : (
            prices && prices.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={prices}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'Rubik' }} />
                  <YAxis tickFormatter={(v) => `₪${v}`} tick={{ fontSize: 11, fontFamily: 'Rubik' }} />
                  <Tooltip
                    formatter={(v, name) => [formatCurrency(v), name]}
                    labelFormatter={(l) => formatDate(l)}
                  />
                  <Legend />
                  {getStoreKeys(prices).map((store, i) => (
                    <Line
                      key={store}
                      type="monotone"
                      dataKey={store}
                      stroke={['#16a34a', '#2563eb', '#d97706', '#dc2626'][i % 4]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty-msg">אין היסטוריית מחירים לאותו מוצר עדיין.</p>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function buildChartData(rawPrices) {
  const byDate = {};
  for (const item of rawPrices) {
    const date  = item.receipts?.date;
    const store = item.receipts?.stores?.store_chains?.name || 'לא ידוע';
    if (!date) continue;
    if (!byDate[date]) byDate[date] = { date };
    byDate[date][store] = item.price;
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

function getStoreKeys(data) {
  const keys = new Set();
  data.forEach((row) => Object.keys(row).filter((k) => k !== 'date').forEach((k) => keys.add(k)));
  return [...keys];
}
