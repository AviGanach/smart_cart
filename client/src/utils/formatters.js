/**
 * Format a number as Israeli Shekel
 */
export function formatCurrency(amount) {
  if (amount == null) return '—';
  return `₪${Number(amount).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a date string to Hebrew locale
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/**
 * Calculate % change between two numbers
 */
export function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Format percent with + sign
 */
export function formatPercent(value) {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Receipt status → Hebrew label + color
 */
export function statusLabel(status) {
  const map = {
    pending:    { label: 'ממתין',    color: '#d97706' },
    processing: { label: 'מעובד',    color: '#2563eb' },
    done:       { label: 'הושלם',   color: '#16a34a' },
    error:      { label: 'שגיאה',   color: '#dc2626' },
  };
  return map[status] || { label: status, color: '#64748b' };
}
