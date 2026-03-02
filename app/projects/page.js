import { getDB } from '@/lib/config';
import { queryDB, getTitle, getNumber, getSelect, getDate, getRelationId } from '@/lib/notion';
import ConstructionNav from '@/components/ConstructionNav';
import AddEntryModal from '@/components/AddEntryModal';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const fmt = (n) => { const a=Math.abs(n||0); return (n<0?'-':'')+a.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}); };

  let projects=[], todoCosto=[], todoCostoAvances=[], expenses=[];
  try { const db=getDB('projects'); if(db) projects=await queryDB(db); } catch(e){}
  try { const db=getDB('todoCosto'); if(db) todoCosto=await queryDB(db); } catch(e){}
  try { const db=getDB('todoCostoAvances'); if(db) todoCostoAvances=await queryDB(db, null, [{property:'Fecha',direction:'descending'}]); } catch(e){}
  try { const db=getDB('expenses'); if(db) expenses=await queryDB(db); } catch(e){}

  // Group expenses by project ID with full details
  const expensesByProject = {};
  expenses.forEach(exp => {
    const status = getSelect(exp, 'Status') || '';
    if (['Pending Reimbursement', 'Reimbursed', 'Para Contador'].includes(status)) {
      const projectId = getRelationId(exp, 'Project');
      if (projectId) {
        if (!expensesByProject[projectId]) {
          expensesByProject[projectId] = { total: 0, count: 0, items: [], latestDate: '' };
        }
        const amount = getNumber(exp, 'Amount') || 0;
        const desc = getTitle(exp) || '';
        const date = getDate(exp, 'Date') || '';
        const kdriveUrl = exp.properties?.kDrive?.url || '';
        expensesByProject[projectId].total += amount;
        expensesByProject[projectId].count += 1;
        expensesByProject[projectId].items.push({ desc, amount, date, status, kdriveUrl });
        // Update latest date
        if (date && (!expensesByProject[projectId].latestDate || date > expensesByProject[projectId].latestDate)) {
          expensesByProject[projectId].latestDate = date;
        }
      }
    }
  });

  // Separate active and archived projects
  const activeStatuses = ['Active', 'On Site', 'Mobilizing', 'Punch List', 'Bidding', 'Prospect'];
  const archivedStatuses = ['Completed', 'Closed', 'Paused'];

  const activeProjects = projects
    .filter(p => activeStatuses.includes(getSelect(p, 'Status') || ''))
    .map(p => {
      const projectId = p.id;
      const expenseData = expensesByProject[projectId] || { total: 0, count: 0, items: [], latestDate: '' };
      return {
        id: projectId,
        name: getTitle(p), 
        status: getSelect(p,'Status'), 
        progress: getNumber(p,'Progress %')||0,
        budget: getNumber(p,'Estimated Budget')||0, 
        contract: getNumber(p,'Contract Value')||0,
        committed: getNumber(p,'Committed Budget')||0,
        totalSpent: expenseData.total,
        expenseCount: expenseData.count,
        expenses: expenseData.items,
        latestExpenseDate: expenseData.latestDate,
        start: getDate(p,'Start Date'), 
        end: getDate(p,'End Date'), 
        type: getSelect(p,'Project Type'),
      };
    })
    .sort((a, b) => {
      if (a.expenseCount > 0 && b.expenseCount === 0) return -1;
      if (a.expenseCount === 0 && b.expenseCount > 0) return 1;
      if (a.expenseCount > 0 && b.expenseCount > 0) {
        // Sort by most recent expense date descending
        if (!a.latestExpenseDate) return 1;
        if (!b.latestExpenseDate) return -1;
        return b.latestExpenseDate.localeCompare(a.latestExpenseDate);
      }
      // Fallback to status order for projects without expenses
      const order = ['On Site','Active','Mobilizing','Punch List','Bidding','Prospect'];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });

  const archivedProjects = projects
    .filter(p => archivedStatuses.includes(getSelect(p, 'Status') || ''))
    .map(p => {
      const projectId = p.id;
      const expenseData = expensesByProject[projectId] || { total: 0, count: 0, items: [], latestDate: '' };
      return {
        id: projectId,
        name: getTitle(p), 
        status: getSelect(p,'Status'), 
        progress: getNumber(p,'Progress %')||0,
        budget: getNumber(p,'Estimated Budget')||0, 
        contract: getNumber(p,'Contract Value')||0,
        committed: getNumber(p,'Committed Budget')||0,
        totalSpent: expenseData.total,
        expenseCount: expenseData.count,
        expenses: expenseData.items,
        latestExpenseDate: expenseData.latestDate,
        start: getDate(p,'Start Date'), 
        end: getDate(p,'End Date'), 
        type: getSelect(p,'Project Type'),
      };
    });

  // Build advances by project ID
  const advByProject = {};
  todoCostoAvances.forEach(a => {
    const projId = a.properties?.['Todo Costo']?.relation?.[0]?.id;
    if (!projId) return;
    if (!advByProject[projId]) advByProject[projId] = [];
    advByProject[projId].push({
      desc: getTitle(a), amount: getNumber(a,'Monto')||0,
      date: getDate(a,'Fecha'), paidBy: getSelect(a,'Pagado por')||'Jeff',
      reembolsado: getSelect(a,'Reembolsado')||'Pendiente',
      notes: a.properties?.Notas?.rich_text?.[0]?.plain_text||'',
    });
  });

  const todoData = todoCosto.map(t => ({
    id: t.id,
    name: getTitle(t), budget: getNumber(t,'Presupuesto Total')||0,
    pending: t.properties?.Pendiente?.formula?.number||0, status: getSelect(t,'Estado'),
    start: getDate(t,'Fecha inicio'),
    advances: advByProject[t.id] || [],
  }));

  const statusColor = (s) => {
    if(s==='On Site'||s==='Active') return 'bg-emerald-100 text-emerald-800';
    if(s==='Mobilizing') return 'bg-blue-100 text-blue-800';
    if(s==='Paused') return 'bg-yellow-100 text-yellow-800';
    if(s==='Completed'||s==='Closed') return 'bg-gray-100 text-gray-600';
    return 'bg-purple-100 text-purple-800';
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1a2e 0%, #141f35 100%)' }}>
      <ConstructionNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Todo Costo — FIRST */}
        {todoData.length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-white mb-4">💼 A Todo Costo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {todoData.map((t,i) => {
                const spent = t.budget - Math.max(0,t.pending);
                const pct = t.budget > 0 ? Math.round((spent/t.budget)*100) : 0;
                return (
                  <div key={i} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,168,83,0.2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-white">{t.name}</h3>
                      <span className="text-xs" style={{ color: '#64748b' }}>{t.status} · {t.start||''}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 rounded-full h-2.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className={`h-2.5 rounded-full ${t.pending<=0 && t.advances.filter(a=>a.paidBy==='Jeff'&&a.reembolsado==='Pendiente').length>0?'bg-red-400':t.pending<=0?'bg-blue-400':pct>=90?'bg-red-400':pct>=70?'bg-yellow-400':'bg-emerald-400'}`}
                          style={{ width: `${Math.min(pct,100)}%` }}></div>
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#d4a853' }}>{pct}%</span>
                    </div>
                    <div className="flex justify-between text-xs mb-3" style={{ color: '#94a3b8' }}>
                      <span>Spent: {fmt(spent)} DOP</span>
                      <span>Budget: {fmt(t.budget)} DOP</span>
                      <span className={t.pending > 0 ? 'text-red-400 font-semibold' : 'text-emerald-400'}>
                        Pending: {fmt(Math.max(0,t.pending))} DOP
                      </span>
                    </div>
                    {/* Advances detail */}
                    {t.advances.length > 0 && (
                      <div className="mt-1 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: '#94a3b8' }}>AVANCES</p>
                        {t.advances.map((a,j) => (
                          <div key={j} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${a.paidBy==='Jeff'?'bg-blue-900/50 text-blue-300':a.paidBy==='Cliente'?'bg-emerald-900/50 text-emerald-300':'bg-gray-700 text-gray-300'}`}>
                                {a.paidBy==='Jeff'?'👤 Jeff':a.paidBy==='Cliente'?'✅ Cliente':a.paidBy}
                              </span>
                              <span className="text-xs text-white">{a.desc}</span>
                              {a.date && <span className="text-xs" style={{ color: '#64748b' }}>{a.date}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {a.paidBy==='Jeff' && a.reembolsado==='Reembolsado' && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300">✓ Reembolsado</span>
                              )}
                              <span className="text-xs font-mono font-semibold" style={{ color: a.paidBy==='Jeff' && a.reembolsado!=='Reembolsado' ? '#f87171' : '#6ee7b7', textDecoration: a.reembolsado==='Reembolsado' ? 'line-through' : 'none', opacity: a.reembolsado==='Reembolsado' ? 0.6 : 1 }}>
                                {fmt(a.amount)} DOP
                              </span>
                            </div>
                          </div>
                        ))}
                        {t.advances.filter(a=>a.paidBy==='Jeff' && a.reembolsado==='Pendiente').length > 0 && (
                          <div className="flex justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="text-xs font-semibold" style={{ color: '#f87171' }}>⚠️ Client owes Jeff</span>
                            <span className="text-xs font-mono font-bold" style={{ color: '#f87171' }}>
                              {fmt(t.advances.filter(a=>a.paidBy==='Jeff' && a.reembolsado==='Pendiente').reduce((s,a)=>s+a.amount,0))} DOP
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Projects</h2>
          <AddEntryModal defaultType="project" triggerLabel="+ Add Project" />
        </div>

        {/* Active Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {activeProjects.map((p,i) => (
            <div key={i} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  {p.expenseCount > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-900/50 text-blue-200">
                      📎 Facturas {p.expenseCount}
                    </span>
                  )}
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>
              </div>
              {p.type && <p className="text-xs mb-3" style={{ color: '#64748b' }}>{p.type} · {p.start||'No start'} → {p.end||'No end'}</p>}

              {/* Total Spent - Prominent */}
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(212, 168, 83, 0.1)', border: '1px solid rgba(212, 168, 83, 0.3)' }}>
                <p className="text-2xl font-bold" style={{ color: '#d4a853' }}>
                  Total: {fmt(p.totalSpent)} DOP
                </p>
              </div>

              {/* Expandable Expenses */}
              {p.expenses.length > 0 && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm font-semibold mb-2" style={{ color: '#94a3b8' }}>
                    📋 {p.expenses.length} expenses — view details
                  </summary>
                  <div className="mt-2 space-y-2">
                    {p.expenses.map((exp, j) => (
                      <div key={j} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              exp.status === 'Pending Reimbursement' || exp.status === 'Reimbursed' 
                                ? 'bg-blue-900/50 text-blue-300' 
                                : 'bg-purple-900/50 text-purple-300'
                            }`}>
                              {exp.status === 'Pending Reimbursement' || exp.status === 'Reimbursed' ? '👤 Jeff' : '📋 Contador'}
                            </span>
                            {exp.date && <span className="text-xs" style={{ color: '#64748b' }}>{exp.date}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <a href="/expenses" className="text-sm font-medium text-blue-400 hover:text-blue-300 underline">
                              {exp.desc}
                            </a>
                            {exp.kdriveUrl && (
                              <a href={exp.kdriveUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-300">
                                📎
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 sm:mt-0 text-right">
                          <p className="text-sm font-mono font-bold text-white">
                            {fmt(exp.amount)} DOP
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Budget/Contract/Committed - Secondary */}
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-xs" style={{ color: '#64748b' }}>Budget</p>
                  <p className="font-mono font-semibold text-white">{p.budget ? fmt(p.budget) : '—'}</p>
                </div>
                <div className="rounded-lg py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-xs" style={{ color: '#64748b' }}>Contract</p>
                  <p className="font-mono font-semibold text-white">{p.contract ? fmt(p.contract) : '—'}</p>
                </div>
                <div className="rounded-lg py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-xs" style={{ color: '#64748b' }}>Committed</p>
                  <p className="font-mono font-semibold text-white">{p.committed ? fmt(p.committed) : '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Archived Projects Section */}
        {archivedProjects.length > 0 && (
          <details className="mb-8">
            <summary className="cursor-pointer text-lg font-semibold mb-4 text-white">
              📦 Completed / Archived Projects ({archivedProjects.length})
            </summary>
            <div className="space-y-4">
              {archivedProjects.map((p, i) => (
                <details key={i} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <summary className="cursor-pointer text-base font-bold text-white mb-2 list-none">
                    {p.name} — Total: {fmt(p.totalSpent)} DOP
                  </summary>
                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {p.type && <p className="text-xs mb-3" style={{ color: '#64748b' }}>{p.type} · {p.start||'No start'} → {p.end||'No end'}</p>}
                    
                    {/* Expandable Expenses for Archived */}
                    {p.expenses.length > 0 && (
                      <details className="mb-4">
                        <summary className="cursor-pointer text-sm font-semibold mb-2" style={{ color: '#94a3b8' }}>
                          📋 {p.expenses.length} expenses — view details
                        </summary>
                        <div className="mt-2 space-y-2">
                          {p.expenses.map((exp, j) => (
                            <div key={j} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                    exp.status === 'Pending Reimbursement' || exp.status === 'Reimbursed' 
                                      ? 'bg-blue-900/50 text-blue-300' 
                                      : 'bg-purple-900/50 text-purple-300'
                                  }`}>
                                    {exp.status === 'Pending Reimbursement' || exp.status === 'Reimbursed' ? '👤 Jeff' : '📋 Contador'}
                                  </span>
                                  {exp.date && <span className="text-xs" style={{ color: '#64748b' }}>{exp.date}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <a href="/expenses" className="text-sm font-medium text-blue-400 hover:text-blue-300 underline">
                                    {exp.desc}
                                  </a>
                                  {exp.kdriveUrl && (
                                    <a href={exp.kdriveUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-300">
                                      📎
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="mt-1 sm:mt-0 text-right">
                                <p className="text-sm font-mono font-bold text-white">
                                  {fmt(exp.amount)} DOP
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Budget/Contract/Committed for Archived */}
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded-lg py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xs" style={{ color: '#64748b' }}>Budget</p>
                        <p className="font-mono font-semibold text-white">{p.budget ? fmt(p.budget) : '—'}</p>
                      </div>
                      <div className="rounded-lg py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xs" style={{ color: '#64748b' }}>Contract</p>
                        <p className="font-mono font-semibold text-white">{p.contract ? fmt(p.contract) : '—'}</p>
                      </div>
                      <div className="rounded-lg py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xs" style={{ color: '#64748b' }}>Committed</p>
                        <p className="font-mono font-semibold text-white">{p.committed ? fmt(p.committed) : '—'}</p>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </details>
        )}

      </main>
    </div>
  );
}
