'use client';

import { useState } from 'react';

function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

export default function PendingReimbursements({ reimbByClient }) {
  const [reimbursedIds, setReimbursedIds] = useState(new Set());
  const [loadingIds, setLoadingIds] = useState(new Set());

  const handleMarkReimbursed = async (pageId, type) => {
    if (!pageId) return;
    setLoadingIds(prev => new Set([...prev, pageId]));
    try {
      const res = await fetch('/api/mark-reimbursed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, type }),
      });
      if (!res.ok) throw new Error('Failed');
      setReimbursedIds(prev => new Set([...prev, pageId]));
    } catch (e) {
      alert('Failed to mark as reimbursed. Try again.');
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(pageId); return s; });
    }
  };

  // Filter out reimbursed items
  const filteredData = {};
  let totalVisible = 0;
  Object.entries(reimbByClient).forEach(([client, items]) => {
    const remaining = items.filter(e => !reimbursedIds.has(e.id));
    if (remaining.length > 0) {
      filteredData[client] = remaining;
      totalVisible += remaining.length;
    }
  });

  if (Object.keys(filteredData).length === 0) return null;

  const grandTotal = Object.values(filteredData).flat().reduce((s, e) => s + e.amount, 0);

  return (
    <div className="rounded-xl overflow-hidden mb-8" style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.12)' }}>
      <a href="/clients" className="px-6 py-4 flex items-center justify-between group cursor-pointer block" style={{ borderBottom: '1px solid rgba(248,113,113,0.1)' }}>
        <h3 className="text-lg font-semibold text-red-400">💰 Pending Reimbursements ({totalVisible})</h3>
        <span className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">View details →</span>
      </a>
      {Object.entries(filteredData).sort((a, b) => b[1].reduce((s, e) => s + e.amount, 0) - a[1].reduce((s, e) => s + e.amount, 0)).map(([client, items]) => {
        const total = items.reduce((s, e) => s + e.amount, 0);
        return (
          <div key={client}>
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-sm font-bold text-white min-w-0 truncate">🏢 {client}</span>
              <span className="text-sm font-bold text-red-400 font-mono shrink-0">{fmt(total)} DOP</span>
            </div>
            {items.map((e, i) => (
              <div key={e.id || i} className="px-4 sm:px-6 pl-6 sm:pl-10 py-2 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{e.desc}</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>{e.date} · {e.category || e.worker || ''}{e.type === 'timesheet' ? ' (TS)' : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-sm font-mono ${e.amount > 0 ? 'text-red-400' : 'text-gray-500'}`}>{fmt(e.amount)}</span>
                  {e.id && (
                    <button
                      onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); handleMarkReimbursed(e.id, e.type || 'expense'); }}
                      disabled={loadingIds.has(e.id)}
                      className="px-2 py-1 text-[10px] font-medium rounded transition-colors disabled:opacity-50 min-h-[32px] sm:min-h-[28px] flex items-center"
                      style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                      onMouseEnter={(ev) => { ev.target.style.backgroundColor = 'rgba(74,222,128,0.3)'; }}
                      onMouseLeave={(ev) => { ev.target.style.backgroundColor = 'rgba(74,222,128,0.15)'; }}
                    >
                      {loadingIds.has(e.id) ? '⏳' : '✓ Reimbursed'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
