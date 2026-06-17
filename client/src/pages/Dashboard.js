import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { FAMILY_ID } from '../App';
import { useFetch } from '../hooks/useFetch';
import {
  getAnalyticsSummary, getWeeklyData, getAnalyticsByStore,
  getTopProducts,
} from '../services/api';
import KpiCard from '../components/KpiCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency, percentChange } from '../utils/formatters';
import './Dashboard.css';

const CHART_COLORS = ['#16a34a', '#2563eb', '#d97706', '#9333ea', '#0891b2', '#dc2626'];

export default function Dashboard() {
  // incrementing this key forces useFetch to re-create its load function → true refetch
  const [refreshKey, setRefreshKey] = useState(0);

  const summary  = useFetch(() => getAnalyticsSummary(FAMILY_ID), [refreshKey]);
  const weekly   = useFetch(() => getWeeklyData(FAMILY_ID),       [refreshKey]);
  const byStore  = useFetch(() => getAnalyticsByStore(FAMILY_ID), [refreshKey]);
  const topProds = useFetch(() => getTopProducts(FAMILY_ID),      [refreshKey]);

  const thisMonth    = summary.data?.thisMonth?.total || 0;
  const prevMonth    = summary.data?.prevMonth?.total || 0;
  const trend        = percentChange(thisMonth, prevMonth);
  const receiptCount = summary.data?.receiptCount ?? '—';

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  if (summary.loading) return <Loader text="טוען נתוני לוח בקרה..." />;

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="section-title">לוח בקרה</h2>
        <button
          onClick={handleRefresh}
          style={{
            background: 'transparent', border: '1px solid var(--color-border)',
            borderRadius: '0.5rem', padding: '0.4rem 0.9rem',
            fontSize: '0.85rem', color: 'var(--color-muted)', cursor: 'pointer',
          }}
        >
          ↻ רענן
        </button>
      </div>

      {/* ── KPI row ── */}
      <div className="kpi-row">
        <KpiCard
          title="הוצאות החודש"
          value={formatCurrency(thisMonth)}
          subtitle={`חודש קודם: ${formatCurrency(prevMonth)}`}
          trend={trend}
          color="green"
        />
        <KpiCard
          title="מספר קבלות החודש"
          value={summary.loading ? '...' : String(receiptCount)}
          color="blue"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="charts-row">
        {/* Weekly bar chart */}
        <div className="chart-card">
          <h3 className="chart-title">הוצאות שבועיות</h3>
          {weekly.loading ? <Loader text="טוען..." /> : weekly.error ? (
            <ErrorMessage message={weekly.error} />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weekly.data || []}
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  style={{ background: 'transparent' }}
                >
                  <XAxis dataKey="week" tick={{ fontSize: 12, fontFamily: 'Rubik' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fontFamily: 'Rubik' }}
                    tickFormatter={(v) => `₪${v.toLocaleString()}`}
                    width={70}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [formatCurrency(v), 'סה"כ']}
                    labelStyle={{ fontFamily: 'Rubik', direction: 'rtl' }}
                    cursor={{ fill: '#f0fdf4' }}
                  />
                  <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Store pie chart */}
        <div className="chart-card">
          <h3 className="chart-title">הוצאות לפי רשת</h3>
          {byStore.loading ? <Loader text="טוען..." /> : byStore.error ? (
            <ErrorMessage message={byStore.error} />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStore.data || []}
                    dataKey="total"
                    nameKey="store"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                  >
                    {(byStore.data || []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(v), 'סה"כ']} />
                  <Legend
                    formatter={(value) => <span style={{ fontFamily: 'Rubik', fontSize: '0.8rem' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Top products ── */}
      <div className="top-products-card">
        <h3 className="chart-title">🏆 5 המוצרים היקרים ביותר החודש</h3>
        {topProds.loading ? <Loader text="טוען..." /> : topProds.error ? (
          <ErrorMessage message={topProds.error} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>מוצר</th>
                <th>מותג</th>
                <th>סה"כ הוצאה</th>
              </tr>
            </thead>
            <tbody>
              {(topProds.data?.mostExpensive || []).map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.brand || '—'}</td>
                  <td><strong>{formatCurrency(p.totalSpent)}</strong></td>
                </tr>
              ))}
              {(!topProds.data?.mostExpensive?.length) && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                    אין נתונים עדיין
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
