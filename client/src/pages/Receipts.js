import React, { useState, useRef, useEffect } from 'react';
import { FAMILY_ID } from '../App';
import { useFetch } from '../hooks/useFetch';
import { getReceipts, getReceiptById, uploadReceipt, deleteReceipt } from '../services/api';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import './Receipts.css';

export default function Receipts() {
  const { data: receipts, loading, error, refetch } = useFetch(
    () => getReceipts(FAMILY_ID), []
  );

  // ── Auto-poll while any receipt is still processing ──────────
  useEffect(() => {
    const hasProcessing = (receipts || []).some(
      (r) => r.status === 'pending' || r.status === 'processing'
    );
    if (!hasProcessing) return;

    const timer = setInterval(() => {
      refetch();
    }, 5000); // poll every 5 seconds

    return () => clearInterval(timer);
  }, [receipts, refetch]);

  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState(null);
  const [selectedId,   setSelectedId]   = useState(null);
  const [detail,       setDetail]       = useState(null);
  const [detailLoad,   setDetailLoad]   = useState(false);
  const [deletingId,   setDeletingId]   = useState(null);
  const fileInputRef = useRef();

  // ── Upload ──────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // PDF cannot be combined with other files
    if (files.length > 1 && files.some((f) => f.type === 'application/pdf')) {
      setUploadError('לא ניתן לשלב PDF עם קבצים נוספים. העלה PDF בנפרד, או השתמש בתמונות בלבד.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await uploadReceipt(FAMILY_ID, files);
      refetch();
      setTimeout(refetch, 3000);
      setTimeout(refetch, 8000);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ── Receipt detail ──────────────────────────────────────────
  const openDetail = async (id) => {
    if (selectedId === id) { setSelectedId(null); setDetail(null); return; }
    setSelectedId(id);
    setDetailLoad(true);
    try {
      const data = await getReceiptById(id);
      setDetail(data);
    } catch (err) {
      setDetail(null);
    } finally {
      setDetailLoad(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('האם למחוק את הקבלה? פעולה זו אינה ניתנת לביטול.')) return;

    setDeletingId(id);
    try {
      await deleteReceipt(id);
      if (selectedId === id) { setSelectedId(null); setDetail(null); }
      refetch();
    } catch (err) {
      alert('שגיאה במחיקת הקבלה: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="receipts-page">
      <div className="receipts-header">
        <h2 className="section-title">קבלות</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '⏳ מעלה...' : '+ העלה קבלה'}
          </button>
        </div>
      </div>

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar"><div className="progress-fill" /></div>
          <p>🤖 ה-AI מנתח את הקבלה... (קבלה ארוכה? מספר תמונות מעובדות יחד) זה עלול לקחת מספר שניות</p>
        </div>
      )}

      {uploadError && <ErrorMessage message={uploadError} />}

      {loading ? <Loader text="טוען קבלות..." /> :
       error   ? <ErrorMessage message={error} onRetry={refetch} /> : (
        <div className="receipts-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>תאריך</th>
                <th>חנות</th>
                <th>סה"כ</th>
                <th>סטטוס</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {(receipts || []).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
                    אין קבלות עדיין. העלה את הקבלה הראשונה שלך!
                  </td>
                </tr>
              )}
              {(receipts || []).map((r) => (
                <React.Fragment key={r.id}>
                  <tr className={selectedId === r.id ? 'row-selected' : ''}>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.stores?.store_chains?.name || '—'}</td>
                    <td><strong>{formatCurrency(r.total)}</strong></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="actions-cell">
                      {(r.status === 'processing' || r.status === 'pending') ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                          מעבד...
                        </span>
                      ) : (
                        <button
                          className="btn-outline-sm"
                          onClick={() => openDetail(r.id)}
                        >
                          {selectedId === r.id ? '▲ סגור' : '▼ פרטים'}
                        </button>
                      )}
                      <button
                        className="btn-delete-sm"
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        title="מחק קבלה"
                      >
                        {deletingId === r.id ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                  {selectedId === r.id && (
                    <tr className="detail-row">
                      <td colSpan={5}>
                        {detailLoad ? <Loader text="טוען פריטים..." /> : (
                          <ReceiptDetail receipt={detail} />
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReceiptDetail({ receipt }) {
  if (!receipt) return <p style={{ color: 'var(--color-muted)' }}>שגיאה בטעינת פרטים.</p>;

  // Calculate how many items Gemini detected vs. how many were saved
  let totalDetected = null;
  let skippedCount  = 0;
  try {
    if (receipt.raw_text) {
      const raw = JSON.parse(receipt.raw_text);
      totalDetected = raw.items?.length || 0;
      const savedCount = receipt.items?.length || 0;
      skippedCount = Math.max(0, totalDetected - savedCount);
    }
  } catch (_) { /* raw_text not valid JSON – ignore */ }

  return (
    <div className="receipt-detail">
      {skippedCount > 0 && (
        <div className="skipped-warning">
          ⚠️ זוהו <strong>{receipt.items?.length || 0} מתוך {totalDetected}</strong> פריטים.{' '}
          {skippedCount} פריט{skippedCount > 1 ? 'ים' : ''} לא נקרא{skippedCount > 1 ? 'ו' : ''} בגלל תמונה לא ברורה.{' '}
          תוכל למחוק את הקבלה ולנסות שוב עם צילום ברור יותר.
        </div>
      )}
      <table className="data-table detail-table">
        <thead>
          <tr>
            <th>שם מוצר</th>
            <th>כמות</th>
            <th>מחיר</th>
            <th>מחיר ל-100</th>
          </tr>
        </thead>
        <tbody>
          {(receipt.items || []).map((item) => (
            <tr key={item.id}>
              <td>{item.raw_name || item.products?.name}</td>
              <td>{item.qty}</td>
              <td>{formatCurrency(item.price)}</td>
              <td>{item.unit_price_per_100 ? formatCurrency(item.unit_price_per_100) : '—'}</td>
            </tr>
          ))}
          {(!receipt.items?.length) && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>אין פריטים</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
