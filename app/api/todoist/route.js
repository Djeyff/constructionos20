import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.TODOIST_TOKEN;
  if (!token) return NextResponse.json({ tasks: [], error: 'No TODOIST_TOKEN' });

  try {
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Todoist ${res.status}`);
    const all = await res.json();

    const today = new Date().toISOString().slice(0, 10);
    const tasks = all
      .filter(t => !t.is_completed)
      .map(t => ({
        id: t.id,
        content: t.content,
        due: t.due?.date || null,
        priority: t.priority,
        labels: t.labels,
        section: t.section_id,
        project: t.project_id,
        url: t.url,
      }))
      .sort((a, b) => {
        // Overdue first, then today, then future, then no date
        if (!a.due && !b.due) return b.priority - a.priority;
        if (!a.due) return 1;
        if (!b.due) return -1;
        if (a.due < today && b.due >= today) return -1;
        if (b.due < today && a.due >= today) return 1;
        return a.due.localeCompare(b.due) || b.priority - a.priority;
      });

    return NextResponse.json({ tasks, today });
  } catch (e) {
    return NextResponse.json({ tasks: [], error: e.message });
  }
}
