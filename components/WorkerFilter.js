'use client';

export default function WorkerFilter({ workers, selected }) {
  const fmt = (n) => Math.abs(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {workers.map(w => (
        <a key={w.id || w.name} href={w.id ? `/timesheets?worker=${w.id}` : '/timesheets'}
          className="rounded-lg p-3 transition-all cursor-pointer"
          style={w.id === selected
            ? { background: 'linear-gradient(135deg, #d4a853, #c49a45)', color: '#0f1a2e' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }
          }>
          <p className="text-sm font-bold" style={w.id === selected ? { color: '#0f1a2e' } : { color: '#fff' }}>
            {w.name}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs" style={w.id === selected ? { color: '#0f1a2e', opacity: 0.7 } : { color: '#64748b' }}>
              {w.hours}h · {w.count} entries
            </span>
            {w.unpaid > 0 && (
              <span className="text-xs font-bold" style={w.id === selected ? { color: '#7f1d1d' } : { color: '#f87171' }}>
                {fmt(w.unpaid)}
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
