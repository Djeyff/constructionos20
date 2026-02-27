'use client';

import { useState } from 'react';

async function callApi(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function reverseStatus(pageId, field, value) {
  return callApi('/api/reverse-status', { pageId, field, value });
}

// ✓ Paid / ↩ Unpaid toggle
export function MarkPaidButton({ pageId, currentStatus }) {
  const [status, setStatus] = useState(currentStatus || 'Not Paid');
  const [loading, setLoading] = useState(false);
  if (!pageId) return null;
  if (status !== 'Paid' && status !== 'Not Paid') return null;

  const isPaid = status === 'Paid';

  const handleClick = async (e) => {
    e.preventDefault(); e.stopPropagation(); setLoading(true);
    try {
      if (isPaid) {
        await reverseStatus(pageId, 'Employee payment status', 'Not Paid');
        setStatus('Not Paid');
      } else {
        await callApi('/api/pay-worker', { pageIds: [pageId] });
        setStatus('Paid');
      }
    } catch { alert('Failed'); }
    setLoading(false);
  };

  return (
    <button onClick={handleClick} disabled={loading}
      className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors disabled:opacity-50 min-h-[28px] whitespace-nowrap"
      style={isPaid
        ? { backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
        : { backgroundColor: 'rgba(212,168,83,0.15)', color: '#d4a853', border: '1px solid rgba(212,168,83,0.25)' }
      }
    >{loading ? '⏳' : isPaid ? '↩ Unpaid' : '✓ Paid'}</button>
  );
}

// ✓ Reimbursed / ↩ Pending toggle
export function MarkReimbursedButton({ pageId, type, currentStatus }) {
  const [status, setStatus] = useState(currentStatus || 'Pending Reimbursement');
  const [loading, setLoading] = useState(false);
  if (!pageId) return null;
  if (status !== 'Reimbursed' && status !== 'Pending Reimbursement') return null;

  const isReimbursed = status === 'Reimbursed';

  const handleClick = async (e) => {
    e.preventDefault(); e.stopPropagation(); setLoading(true);
    try {
      if (isReimbursed) {
        await reverseStatus(pageId, 'Status', 'Pending Reimbursement');
        setStatus('Pending Reimbursement');
      } else {
        await callApi('/api/mark-reimbursed', { pageId, type });
        setStatus('Reimbursed');
      }
    } catch { alert('Failed'); }
    setLoading(false);
  };

  return (
    <button onClick={handleClick} disabled={loading}
      className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors disabled:opacity-50 min-h-[28px] whitespace-nowrap"
      style={isReimbursed
        ? { backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
        : { backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }
      }
    >{loading ? '⏳' : isReimbursed ? '↩ Pending' : '✓ Reimbursed'}</button>
  );
}
