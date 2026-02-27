 'use client';

import { useState, useTransition } from 'react';

export default function UnpaidWorkers({ unpaidByClient, pendingTsPayLength }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticData, setOptimisticData] = useState(unpaidByClient);

  const handleMarkPaid = async (pageIds, client, worker) => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/pay-worker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to mark as paid');
        }

        const result = await response.json();
        if (result.success) {
          // Optimistically remove from UI
          setOptimisticData(prev => {
            const newData = { ...prev };
            if (newData[client]) {
              delete newData[client][worker];
              if (Object.keys(newData[client]).length === 0) {
                delete newData[client];
              }
            }
            return newData;
          });
        }
      } catch (error) {
        console.error('Error marking paid:', error);
        alert('Failed to mark as paid. Please try again.');
        // Optionally refresh data from server
      }
    });
  };

  // If no data left, don't render
  if (Object.keys(optimisticData).length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl overflow-hidden mb-8" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)' }}>
      <a href="/timesheets?filter=unpaid" className="px-6 py-4 flex items-center justify-between group cursor-pointer block" style={{ borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
        <h3 className="text-lg font-semibold text-amber-400">👷 Unpaid Workers ({pendingTsPayLength})</h3>
        <span className="text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">View details →</span>
      </a>
      {Object.entries(optimisticData).map(([client, workers]) => {
        const clientTotal = Object.values(workers).flat().reduce((s, t) => s + t.amount, 0);
        return (
          <div key={client}>
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-sm font-bold text-white min-w-0 truncate">🏢 {client}</span>
              <span className="text-sm font-bold text-amber-400 font-mono shrink-0">{clientTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DOP</span>
            </div>
            {Object.entries(workers).map(([worker, tasks]) => {
              if (!tasks.length) return null; // Skip if removed
              const wTotal = tasks.reduce((s, t) => s + t.amount, 0);
              const pageIds = tasks.map(t => t.id).filter(Boolean);
              return (
                <div key={worker}>
                  <div className="px-4 sm:px-6 pl-6 sm:pl-10 py-2 flex items-center justify-between gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-sm font-semibold min-w-0 truncate" style={{ color: '#d4a853' }}>👤 {worker}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-mono text-amber-400">{wTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DOP</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (pageIds.length === 0) {
                            alert('No timesheets found for this worker.');
                            return;
                          }
                          if (confirm(`Mark all ${tasks.length} timesheets for ${worker} as Paid?`)) {
                            handleMarkPaid(pageIds, client, worker);
                          }
                        }}
                        disabled={isPending || pageIds.length === 0}
                        className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
                        style={{
                          backgroundColor: '#d4a853',
                          color: '#0a0a0a',
                          border: '1px solid rgba(212, 168, 83, 0.3)',
                        }}
                        onMouseEnter={(e) => { e.target.style.backgroundColor = '#c49a45'; }}
                        onMouseLeave={(e) => { e.target.style.backgroundColor = '#d4a853'; }}
                      >
                        {isPending ? '⏳' : '💰 Mark Paid'}
                      </button>
                    </div>
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
                          <span className="text-xs font-mono shrink-0" style={{ color: '#d4a853', opacity: 0.7 }}>{pts.reduce((s, t) => s + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DOP</span>
                        </div>
                        {pts.map((t, i) => (
                          <div key={i} className="px-4 sm:px-6 pl-12 sm:pl-24 py-1.5 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <p className="text-xs flex-1 min-w-0 truncate" style={{ color: '#94a3b8' }}>{t.date} · {t.task} · {t.hours}h</p>
                            <span className={`text-xs font-mono shrink-0 ${t.amount > 0 ? 'text-white' : 'text-gray-500'}`}>{t.amount > 0 ? t.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '—'}</span>
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
