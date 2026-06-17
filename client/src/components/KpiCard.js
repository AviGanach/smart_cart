import React from 'react';
import './KpiCard.css';

export default function KpiCard({ title, value, subtitle, trend, color = 'green' }) {
  const isPositiveTrend = trend && trend > 0;
  const trendClass = isPositiveTrend ? 'trend-up' : 'trend-down';

  return (
    <div className={`kpi-card kpi-${color}`}>
      <p className="kpi-title">{title}</p>
      <p className="kpi-value">{value}</p>
      {subtitle && <p className="kpi-subtitle">{subtitle}</p>}
      {trend != null && (
        <p className={`kpi-trend ${trendClass}`}>
          {isPositiveTrend ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% לעומת חודש קודם
        </p>
      )}
    </div>
  );
}
