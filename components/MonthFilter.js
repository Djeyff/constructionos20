'use client';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function MonthFilter({ basePath, selected, extraParams }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const buildHref = (month) => {
    const params = new URLSearchParams(extraParams || {});
    if (month) params.set('month', month);
    else params.delete('month');
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a href={buildHref(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={!selected
          ? { background: 'linear-gradient(135deg, #d4a853, #c49a45)', color: '#0f1a2e' }
          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }
        }>All</a>
      {MONTHS.map((m, i) => {
        if (i > currentMonth && currentYear === now.getFullYear()) return null;
        const val = `${currentYear}-${String(i+1).padStart(2,'0')}`;
        const isSelected = selected === val;
        return (
          <a key={val} href={buildHref(val)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={isSelected
              ? { background: 'linear-gradient(135deg, #d4a853, #c49a45)', color: '#0f1a2e' }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }
            }>{m}</a>
        );
      })}
    </div>
  );
}
