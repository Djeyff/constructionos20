'use client';
import { useState, useEffect } from 'react';

export default function CashFlowPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cashflow').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}><p className="text-white animate-pulse">Loading...</p></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}><p className="text-red-400">Error loading data</p></div>;

  const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen px-3 sm:px-6 py-6" style={{ background: '#0a0a0a', color: '#e2e8f0' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <a href="/" className="text-sm px-3 py-1.5 rounded-lg" style={{ background: '#1e293b', color: '#94a3b8' }}>← Dashboard</a>
          <h1 className="text-xl sm:text-2xl font-bold text-white">💰 Cash Position</h1>
        </div>

        {/* Summary card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl p-4 sm:p-6" style={{ background: '#111', border: '1px solid #1e293b' }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: '#94a3b8' }}>Te deben</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: '#f87171' }}>{fmt(data.totalOwed)} <span className="text-sm">DOP</span></p>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>Pending Reimbursement</p>
          </div>
          <div className="rounded-xl p-4 sm:p-6" style={{ background: '#111', border: '1px solid #1e293b' }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: '#94a3b8' }}>Facturas a crédito</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: '#94a3b8' }}>{data.supplierBreakdown.length} <span className="text-sm">pendientes</span></p>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>Para contador</p>
          </div>
        </div>

        {/* Who owes Jeff */}
        <div className="rounded-xl mb-6" style={{ background: '#111', border: '1px solid #1e293b' }}>
          <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: '#1e293b' }}>
            <h2 className="text-lg font-semibold text-white">📥 Te deben (por cliente/proyecto)</h2>
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            {data.clientBreakdown.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{c.name}</p>
                  <div className="w-full h-2 rounded-full mt-1" style={{ background: '#1e293b' }}>
                    <div className="h-2 rounded-full bg-red-400" style={{ width: `${Math.min((c.amount / data.totalOwed) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <span className="ml-4 text-sm font-mono font-bold whitespace-nowrap" style={{ color: '#f87171' }}>{fmt(c.amount)} DOP</span>
              </div>
            ))}
            {data.clientBreakdown.length === 0 && <p className="text-sm" style={{ color: '#64748b' }}>Nobody owes you. Nice.</p>}
          </div>
        </div>

        {/* Supplier list - no amounts */}
        <div className="rounded-xl mb-6" style={{ background: '#111', border: '1px solid #1e293b' }}>
          <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: '#1e293b' }}>
            <h2 className="text-lg font-semibold text-white">📤 Facturas a crédito (para contador)</h2>
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            {data.supplierBreakdown.map((s, i) => (
              <div key={i} className="py-2 border-b" style={{ borderColor: '#1e293b' }}>
                <p className="text-sm font-medium text-white">{s.vendor}</p>
                {s.products && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{s.products.replace(/,\s*/g, ' — ').replace(/\+/g, ' — ')}</p>}
                <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                  {s.client && <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1e293b', color: '#d4a853' }}>{s.client}</span>}
                  {s.category && <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1e293b', color: '#94a3b8' }}>{s.category}</span>}
                  {s.kdriveUrl && <a href={s.kdriveUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>📷 Ver factura</a>}
                </div>
              </div>
            ))}
            {data.supplierBreakdown.length === 0 && <p className="text-sm" style={{ color: '#64748b' }}>Ninguna factura a crédito pendiente.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
