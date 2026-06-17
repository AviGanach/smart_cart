import React from 'react';
import { statusLabel } from '../utils/formatters';

export default function StatusBadge({ status }) {
  const { label, color } = statusLabel(status);
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.78rem',
      fontWeight: 600,
      background: color + '20',
      color,
      border: `1px solid ${color}40`,
    }}>
      {label}
    </span>
  );
}
