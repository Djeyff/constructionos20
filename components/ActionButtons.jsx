'use client';

import { useState } from 'react';

export function MarkPaidButton({ pageId }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  if (done) return <span className="text-xs text-emerald-400">✓ Done</span>;
  if (!pageId) return null;
  return (
    <button onClick={async (e) => {
      e.preventDefault(); e.stopPropagation(); setLoading(true);
      try {
        const res = await fetch('/api/pay-worker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageIds: [pageId] }) });
        if (res.ok) setDone(true); else alert('Failed');
      } catch { alert('Failed'); }
      setLoading(false);
    }} disabled={loading}
      className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors disabled:opacity-50 min-h-[28px] whitespace-nowrap"
      style={{ backgroundColor: 'rgba(212,168,83,0.15)', color: '#d4a853', border: '1px solid rgba(212,168,83,0.25)' }}
    >{loading ? '⏳' : '✓ Paid'}</button>
  );
}

export function MarkReimbursedButton({ pageId, type }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  if (done) return <span className="text-xs text-emerald-400">✓ Done</span>;
  if (!pageId) return null;
  return (
    <button onClick={async (e) => {
      e.preventDefault(); e.stopPropagation(); setLoading(true);
      try {
        const res = await fetch('/api/mark-reimbursed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId, type }) });
        if (res.ok) setDone(true); else alert('Failed');
      } catch { alert('Failed'); }
      setLoading(false);
    }} disabled={loading}
      className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors disabled:opacity-50 min-h-[28px] whitespace-nowrap"
      style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
    >{loading ? '⏳' : '✓ Reimbursed'}</button>
  );
}
