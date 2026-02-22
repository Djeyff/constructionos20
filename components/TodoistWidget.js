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

  const overdue = tasks.filter(t => t.due && t.due < today);
  const todayTasks = tasks.filter(t => t.due === today);
  const upcoming = tasks.filter(t => t.due && t.due > today);
  const noDue = tasks.filter(t => !t.due);

  const limit = compact ? 5 : 999;
  const priorityColor = (p) => {
    if (p === 4) return '#f87171'; // red
    if (p === 3) return '#fb923c'; // orange
    if (p === 2) return '#60a5fa'; // blue
    return '#94a3b8';
  };

  const TaskItem = ({ task }) => (
    <div className="flex items-start gap-2.5 py-2 px-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div className="mt-1 w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: priorityColor(task.priority) }}></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{task.content}</p>
        {task.due && <p className="text-xs" style={{ color: task.due < today ? '#f87171' : task.due === today ? '#d4a853' : '#64748b' }}>
          {task.due < today ? `⚠️ Overdue: ${task.due}` : task.due === today ? '📌 Today' : task.due}
        </p>}
      </div>
    </div>
  );

  return (
    <div>
      {overdue.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-1">⚠️ Overdue ({overdue.length})</p>
          {overdue.slice(0, limit).map(t => <TaskItem key={t.id} task={t} />)}
        </div>
      )}
      {todayTasks.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#d4a853' }}>📌 Today ({todayTasks.length})</p>
          {todayTasks.slice(0, limit).map(t => <TaskItem key={t.id} task={t} />)}
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#64748b' }}>Upcoming ({upcoming.length})</p>
          {upcoming.slice(0, compact ? 3 : limit).map(t => <TaskItem key={t.id} task={t} />)}
        </div>
      )}
      {!compact && noDue.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#64748b' }}>No Date ({noDue.length})</p>
          {noDue.slice(0, 10).map(t => <TaskItem key={t.id} task={t} />)}
        </div>
      )}
      {tasks.length === 0 && <p className="text-sm text-center py-4" style={{ color: '#64748b' }}>No tasks ✅</p>}
    </div>
  );
}
