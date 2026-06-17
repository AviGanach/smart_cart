import React from 'react';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fca5a5',
      borderRadius: 'var(--radius)', padding: '1rem 1.25rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
    }}>
      <span style={{ color: '#991b1b', fontSize: '0.9rem' }}>⚠️ {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: '#dc2626', color: '#fff', border: 'none',
            borderRadius: '0.375rem', padding: '0.35rem 0.75rem',
            fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          נסה שוב
        </button>
      )}
    </div>
  );
}
