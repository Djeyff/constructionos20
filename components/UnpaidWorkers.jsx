'use client';

import { useState, useTransition } from 'react';

function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

export default function UnpaidWorkers({ unpaidByClient, pendingTsPayLength }) {
  const [paidIds, setPaidIds] = useState(new Set());
  const [loadingIds, setLoadingIds] = useState(new Set());

  const handleMarkPaid = async (pageId) => {
    if (!pageId) return;
    setLoadingIds(prev => new Set([...prev, pageId]));
    try {
      const res = await fetch('/api/pay-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageIds: [pageId] }),
      });
      if (!res.ok) throw new Error('Failed');
      const result = await res.json();
      if (result.success) {
        setPaidIds(prev => new Set([...prev, pageId]));
      }
    } catch (e) {
      alert('Failed to mark as paid. Try again.');
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(pageId); return s; });
    }
  };

  // Filter out paid timesheets from display
  const filteredData = {};
  let totalVisible = 0;
  Object.entries(unpaidByClient).forEach(([client, workers]) => {
    const filteredWorkers = {};
    Object.entries(workers).forEach(([worker, tasks]) => {
      const remaining = tasks.filter(t => !paidIds.has(t.id));
      if (remaining.length > 0) {
        filteredWorkers[worker] = remaining;
        totalVisible += remaining.length;
      }
    });
    if (Object.keys(filteredWorkers).length > 0) filteredData[client] = filteredWorkers;
  });

  if (Object.keys(filteredData).length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden mb-8" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)' }}>
      <a href="/timesheets?filter=unpaid" className="px-6 py-4 flex items-center justify-between group cursor-pointer block" style={{ borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
        <h3 className="text-lg font-semibold text-amber-400">👷 Unpaid Workers ({totalVisible})</h3>
        <span className="text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">View details →</span>
      </a>
      {Object.entries(filteredData).map(([client, workers]) => {
        const clientTotal = Object.values(workers).flat().reduce((s, t) => s + t.amount, 0);
        return (
          <div key={client}>
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-sm font-bold text-white min-w-0 truncate">🏢 {client}</span>
              <span className="text-sm font-bold text-amber-400 font-mono shrink-0">{fmt(clientTotal)} DOP</span>
            </div>
            {Object.entries(workers).map(([worker, tasks]) => {
              const wTotal = tasks.reduce((s, t) => s + t.amount, 0);
              return (
                <div key={worker}>
                  <div className="px-4 sm:px-6 pl-6 sm:pl-10 py-2 flex items-center justify-between gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-sm font-semibold min-w-0 truncate" style={{ color: '#d4a853' }}>👤 {worker}</span>
                    <span className="text-sm font-mono text-amber-400">{fmt(wTotal)} DOP</span>
                  </div>
                  {(() => {
                    const byProject = {};
                    tasks.forEach(t => {
                      const proj = t.project || 'Sin Proyecto';
                      if (!byProject[proj]) byProject[proj] = [];
                      byProject[proj].push(t);
                    });
                    return Object.entries(byProject).map(([proj, pts]) => (
                      <div key={proj}>
                        <div className="px-4 sm:px-6 pl-10 sm:pl-20 py-1 flex items-center justify-between gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: 'rgba(255,255,255,0.01)' }}>
                          <span className="text-xs font-semibold" style={{ color: '#d4a853', opacity: 0.7 }}>📁 {proj}</span>
                          <span className="text-xs font-mono shrink-0" style={{ color: '#d4a853', opacity: 0.7 }}>{fmt(pts.reduce((s, t) => s + t.amount, 0))} DOP</span>
                        </div>
                        {pts.map((t, i) => (
                          <div key={t.id || i} className="px-4 sm:px-6 pl-12 sm:pl-24 py-1.5 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <p className="text-xs flex-1 min-w-0 truncate" style={{ color: '#94a3b8' }}>{t.date} · {t.task} · {t.hours}h</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs font-mono ${t.amount > 0 ? 'text-white' : 'text-gray-500'}`}>{t.amount > 0 ? fmt(t.amount) : '—'}</span>
                              {t.id && (
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkPaid(t.id); }}
                                  disabled={loadingIds.has(t.id)}
                                  className="px-2 py-1 text-[10px] font-medium rounded transition-colors disabled:opacity-50 min-h-[32px] sm:min-h-[28px] flex items-center"
                                  style={{ backgroundColor: 'rgba(212,168,83,0.15)', color: '#d4a853', border: '1px solid rgba(212,168,83,0.25)' }}
                                  onMouseEnter={(e) => { e.target.style.backgroundColor = 'rgba(212,168,83,0.3)'; }}
                                  onMouseLeave={(e) => { e.target.style.backgroundColor = 'rgba(212,168,83,0.15)'; }}
                                >
                                  {loadingIds.has(t.id) ? '⏳' : '✓ Paid'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
