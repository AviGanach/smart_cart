import React, { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getStores, getProducts, getProductPrices } from '../services/api';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency } from '../utils/formatters';
import './Compare.css';

export default function Compare() {
  const { data: stores, loading: storeLoad } = useFetch(getStores, []);
  const { data: products, loading: prodLoad } = useFetch(
    () => getProducts({}), []
  );

  const [selectedStores,   setSelectedStores]   = useState([]);
  const [compareData,      setCompareData]       = useState([]);
  const [comparing,        setComparing]         = useState(false);
  const [compareError,     setCompareError]      = useState(null);

  const toggleStore = (id) => {
    setSelectedStores((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleCompare = async () => {
    if (selectedStores.length < 2) return;
    setComparing(true);
    setCompareError(null);

    try {
      // For each product, fetch its price history and filter to selected stores
      const rows = [];
      for (const product of (products || []).slice(0, 50)) {
        const prices = await getProductPrices(product.id);
        if (!prices.length) continue;

        const storePrices = {};
        for (const item of prices) {
          const storeId = item.receipts?.stores?.id;
          if (selectedStores.includes(storeId)) {
            // Take the most recent price for this store
            if (!storePrices[storeId]) {
              storePrices[storeId] = item.price;
            }
          }
        }

        // Only include products that have prices in at least 2 of the selected stores
        const priceCount = Object.keys(storePrices).length;
        if (priceCount >= 2) {
          rows.push({ product, storePrices });
        }
      }
      setCompareData(rows);
    } catch (e) {
      setCompareError(e.message);
    } finally {
      setComparing(false);
    }
  };

  const getStoreById = (id) => (stores || []).find((s) => s.id === id);

  const getCheapestStore = (storePrices) => {
    return Object.entries(storePrices).reduce(
      (best, [storeId, price]) =>
        price < (best.price ?? Infinity) ? { storeId, price } : best,
      {}
    );
  };

  return (
    <div className="compare-page">
      <h2 className="section-title">⚖️ השוואת מחירים בין רשתות</h2>

      {/* Store selector */}
      <div className="store-selector-card">
        <h3>בחר 2–3 רשתות להשוואה:</h3>
        {storeLoad ? <Loader text="טוען רשתות..." /> : (
          <div className="store-chips">
            {(stores || []).map((s) => {
              const isSelected = selectedStores.includes(s.id);
              return (
                <button
                  key={s.id}
                  className={`store-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleStore(s.id)}
                  disabled={!isSelected && selectedStores.length >= 3}
                >
                  {s.store_chains?.name || s.branch_name}
                  {s.city ? ` – ${s.city}` : ''}
                </button>
              );
            })}
          </div>
        )}
        <button
          className="btn-primary"
          onClick={handleCompare}
          disabled={selectedStores.length < 2 || comparing || prodLoad}
        >
          {comparing ? '⏳ משווה...' : '🔍 השווה'}
        </button>
      </div>

      {compareError && <ErrorMessage message={compareError} />}

      {/* Results table */}
      {compareData.length > 0 && (
        <div className="compare-table-wrapper">
          <table className="data-table compare-table">
            <thead>
              <tr>
                <th>מוצר</th>
                {selectedStores.map((id) => (
                  <th key={id}>
                    {getStoreById(id)?.store_chains?.name || '—'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareData.map(({ product, storePrices }) => {
                const cheapest = getCheapestStore(storePrices);
                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      {product.brand && <span className="brand-tag"> · {product.brand}</span>}
                    </td>
                    {selectedStores.map((storeId) => {
                      const price   = storePrices[storeId];
                      const isBest  = cheapest.storeId === storeId;
                      return (
                        <td key={storeId} className={isBest ? 'best-price' : ''}>
                          {price != null ? (
                            <>
                              {formatCurrency(price)}
                              {isBest && <span className="cheap-badge"> ✓ זול יותר</span>}
                            </>
                          ) : <span className="no-data">אין נתון</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {compareData.length === 0 && (
            <p className="empty-msg">לא נמצאו מוצרים משותפים לרשתות שנבחרו.</p>
          )}
        </div>
      )}
    </div>
  );
}
