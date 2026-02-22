import ConstructionNav from '@/components/ConstructionNav';
import TodoistWidget from '@/components/TodoistWidget';

export const dynamic = 'force-dynamic';

export default function TasksPage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1a2e 0%, #141f35 100%)' }}>
      <ConstructionNav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Tasks — Todoist</h2>
          <a href="https://todoist.com/app" target="_blank" rel="noopener"
            className="text-xs px-3 py-1.5 rounded-lg" style={{ color: '#d4a853', background: 'rgba(212,168,83,0.1)' }}>
            Open Todoist →
          </a>
        </div>
        <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <TodoistWidget compact={false} />
        </div>
      </main>
    </div>
  );
}
