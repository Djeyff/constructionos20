'use client';

export default function ClientFilter({ basePath, clients, selected, extraParams }) {
  // Build URL preserving other params
  const buildHref = (client) => {
    const params = new URLSearchParams(extraParams || {});
    if (client) params.set('client', client);
    else params.delete('client');
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium" style={{ color: '#64748b' }}>Client:</span>
      <a href={buildHref(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={!selected
          ? { background: 'linear-gradient(135deg, #d4a853, #c49a45)', color: '#0f1a2e' }
          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }
        }>All</a>
      {clients.map(c => (
        <a key={c} href={buildHref(c)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={selected === c
            ? { background: 'linear-gradient(135deg, #d4a853, #c49a45)', color: '#0f1a2e' }
            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }
          }>{c}</a>
      ))}
    </div>
  );
}
