'use client';
import { useEffect, useState } from 'react';

export default function TodoistWidget({ compact = false }) {
  const [tasks, setTasks] = useState([]);
  const [today, setToday] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/todoist')
      .then(r => r.json())
      .then(d => { setTasks(d.tasks || []); setToday(d.today || ''); setError(d.error || null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-6 text-sm" style={{ color: '#64748b' }}>Loading tasks...</div>;
  if (error) return <div className="text-center py-6 text-sm text-red-400">{error}</div>;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function formatDateLabel(dateStr) {
    if (!dateStr) return 'No Date';
    const todayDate = new Date(today + 'T12:00:00');
    const d = new Date(dateStr.slice(0,10) + 'T12:00:00');
    const diffDays = Math.round((d - todayDate) / 86400000);

    if (diffDays < 0) return `⚠️ Overdue (${Math.abs(diffDays)} day${Math.abs(diffDays)>1?'s':''})`;
    if (diffDays === 0) return '📌 Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  function formatTime(dateStr) {
    if (!dateStr || dateStr.length <= 10) return null;
    // Extract time from ISO string like 2026-02-23T10:00:00
    const match = dateStr.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : null;
  }

  const priorityColor = (p) => {
    if (p === 4) return '#f87171';
    if (p === 3) return '#fb923c';
    if (p === 2) return '#60a5fa';
    return '#94a3b8';
  };

  // Group tasks by date label
  const groups = {};
  const sortOrder = {};
  tasks.forEach(t => {
    const label = formatDateLabel(t.due);
    if (!groups[label]) { groups[label] = []; sortOrder[label] = t.due || 'zzzz'; }
    groups[label].push(t);
  });

  const sortedGroups = Object.entries(groups).sort((a, b) => {
    const sa = sortOrder[a[0]] || 'zzzz';
    const sb = sortOrder[b[0]] || 'zzzz';
    // Overdue first
    if (a[0].includes('Overdue') && !b[0].includes('Overdue')) return -1;
    if (!a[0].includes('Overdue') && b[0].includes('Overdue')) return 1;
    // No date last
    if (a[0] === 'No Date') return 1;
    if (b[0] === 'No Date') return -1;
    return sa.localeCompare(sb);
  });

  const labelColor = (label) => {
    if (label.includes('Overdue')) return '#f87171';
    if (label.includes('Today')) return '#d4a853';
    if (label === 'Tomorrow') return '#60a5fa';
    if (label === 'No Date') return '#64748b';
    return '#94a3b8';
  };

  const limit = compact ? 3 : 999;
  const groupLimit = compact ? 3 : 999;
  let groupCount = 0;

  return (
    <div>
      {sortedGroups.map(([label, items]) => {
        groupCount++;
        if (compact && groupCount > groupLimit) return null;
        return (
          <div key={label} className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: labelColor(label) }}>
              {label} ({items.length})
            </p>
            {items.slice(0, limit).map(t => {
              const time = formatTime(t.due);
              return (
                <div key={t.id} className="flex items-start gap-2.5 py-2 px-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="mt-1.5 w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: priorityColor(t.priority) }}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{t.content}</p>
                    {time && <p className="text-xs mt-0.5" style={{ color: '#d4a853' }}>🕐 {time}</p>}
                  </div>
                </div>
              );
            })}
            {items.length > limit && <p className="text-xs pl-6" style={{ color: '#64748b' }}>+{items.length - limit} more</p>}
          </div>
        );
      })}
      {tasks.length === 0 && <p className="text-sm text-center py-4" style={{ color: '#64748b' }}>No tasks ✅</p>}
    </div>
  );
}
