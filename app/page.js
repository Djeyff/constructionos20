import { getDB } from '@/lib/config';
import { queryDB, buildNameMap, getTitle, getNumber, getSelect, getDate, getText, getRelationId } from '@/lib/notion';
import ConstructionNav from '@/components/ConstructionNav';
import MonthFilter from '@/components/MonthFilter';
import TodoistWidget from '@/components/TodoistWidget';
import AddEntryModal from '@/components/AddEntryModal';
import PendingReimbursements from '@/components/PendingReimbursements';
import UnpaidWorkers from '@/components/UnpaidWorkers';

export const dynamic = 'force-dynamic';

export default async function ConstructionDashboard({ searchParams }) {
  const fmt = (n) => { const a=Math.abs(n||0); return (n<0?'-':'')+a.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}); };
  const params = await searchParams;
  const selectedMonth = params?.month || null; // format: 2026-02
  const today = new Date().toISOString().slice(0,10);
  const weekAgo = new Date(Date.now()-7*86400000).toISOString().slice(0,10);

  // Month boundaries
  let monthStart, monthEnd, monthLabel;
  if (selectedMonth) {
    monthStart = selectedMonth + '-01';
    const [y,m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    monthEnd = `${selectedMonth}-${String(lastDay).padStart(2,'0')}`;
    monthLabel = new Date(y, m-1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  } else {
    monthStart = today.slice(0,8)+'01';
    monthEnd = today;
    monthLabel = 'This Month';
  }

  // Fetch name maps
  let clientNames={}, peopleNames={}, projectNames={};
  try { clientNames = await buildNameMap(getDB('clients')); } catch(e){}
  try { peopleNames = await buildNameMap(getDB('people')); } catch(e){}
  try { projectNames = await buildNameMap(getDB('projects')); } catch(e){}

  let expenses=[], timesheets=[], projects=[], todoCosto=[], mantCamioneta=[], personalLedger=[];
  try { expenses=await queryDB(getDB('expenses')); } catch(e){}
  try { timesheets=await queryDB(getDB('timesheets')); } catch(e){}
  try { projects=await queryDB(getDB('projects')); } catch(e){}
  try { todoCosto=await queryDB(getDB('todoCosto')); } catch(e){}
  try { mantCamioneta=await queryDB(getDB('mantCamioneta'),undefined,[{property:'Fecha',direction:'descending'}]); } catch(e){}
  try { personalLedger=await queryDB(getDB('personalLedger'),undefined,[{property:'Date',direction:'ascending'}]); } catch(e){}

  // Process all data
  const allExpenses = expenses.map(e => ({
    id: e.id,
    desc: getTitle(e), amount: getNumber(e,'Amount')||0, date: getDate(e,'Date'),
    status: getSelect(e,'Status'), category: getSelect(e,'Category'),
    client: clientNames[getRelationId(e,'Client')] || '',
    project: projectNames[getRelationId(e,'Project')] || '',
  }));
  const allTimesheets = timesheets.map(t => ({
    id: t.id,
    task: getTitle(t), hours: getNumber(t,'Hours')||0, date: getDate(t,'Date'),
    status: getSelect(t,'Status'), empPay: getSelect(t,'Employee payment status'),
    amount: getNumber(t,'Amount')||getNumber(t,'Fixed Amount')||0,
    worker: peopleNames[getRelationId(t,'Employee')] || '',
    client: clientNames[getRelationId(t,'Client')] || '',
    project: projectNames[getRelationId(t,'Project')] || '',
  }));

  // Month-filtered data
  const monthExp = allExpenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
  const monthTs = allTimesheets.filter(t => t.date >= monthStart && t.date <= monthEnd);
  const totalMonthExp = monthExp.reduce((s,e)=>s+e.amount,0);
  const monthHours = monthTs.reduce((s,t)=>s+t.hours,0);

  // Always-current data (not filtered)
  const pendingReimb = allExpenses.filter(e=>e.status==='Pending Reimbursement');
  const totalPendingReimb = pendingReimb.reduce((s,e)=>s+e.amount,0);
  const pendingTsPay = allTimesheets.filter(t=>t.empPay==='Not Paid');
  const totalPendingTsPay = pendingTsPay.reduce((s,t)=>s+t.amount,0);
  const pendingTsReimb = allTimesheets.filter(t=>t.status==='Pending Reimbursement');
  const totalPendingTsReimb = pendingTsReimb.reduce((s,t)=>s+t.amount,0);

  const projectData = projects.map(p => ({
    name: getTitle(p), status: getSelect(p,'Status'), progress: getNumber(p,'Progress %')||0,
    budget: getNumber(p,'Estimated Budget')||0,
  }));

  const todoData = todoCosto.map(t => ({
    name: getTitle(t), budget: getNumber(t,'Presupuesto Total')||0,
    pending: t.properties?.Pendiente?.formula?.number||0, status: getSelect(t,'Estado'),
  }));

  // Camioneta — find entry with Próximo km set
  const camEntries = mantCamioneta.map(c => ({
    km: getNumber(c,'Odómetro (km)')||0, nextKm: getNumber(c,'Próximo km')||0,
    date: getDate(c,'Fecha'), obs: getText(c,'Observaciones'),
    aceite: getSelect(c,'Aceite motor'), estado: getSelect(c,'Estado'),
  }));
  const lastCam = camEntries[0];
  const camWithNext = camEntries.find(c => c.nextKm > 0);
  const camKm = lastCam?.km || 0;
  const camNextKm = camWithNext?.nextKm || 5000;
  const kmRemaining = camNextKm - camKm;

  // Expense by category (month filtered)
  const catTotals = {};
  monthExp.forEach(e => { catTotals[e.category||'Other'] = (catTotals[e.category||'Other']||0)+e.amount; });
  const catSorted = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const maxCat = catSorted.length ? catSorted[0][1] : 1;

  // Recent expenses (7 days or month)
  const recentExp = selectedMonth
    ? [...monthExp].sort((a,b)=>(b.date||'').localeCompare(a.date||''))
    : [...allExpenses].filter(e=>e.date>=weekAgo).sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  // Group unpaid workers by client > worker
  const unpaidByClient = {};
  pendingTsPay.forEach(t => {
    const key = t.client || 'Sin Cliente';
    if (!unpaidByClient[key]) unpaidByClient[key] = {};
    const wk = t.worker || 'Sin Nombre';
    if (!unpaidByClient[key][wk]) unpaidByClient[key][wk] = [];
    unpaidByClient[key][wk].push(t);
  });

  // Group pending reimbursements by client
  const reimbByClient = {};
  pendingReimb.forEach(e => {
    const key = e.client || 'Sin Cliente';
    if (!reimbByClient[key]) reimbByClient[key] = [];
    reimbByClient[key].push({ ...e, type: 'expense' });
  });
  pendingTsReimb.forEach(t => {
    const key = t.client || 'Sin Cliente';
    if (!reimbByClient[key]) reimbByClient[key] = [];
    reimbByClient[key].push({ id: t.id, desc: t.task, amount: t.amount, date: t.date, category: 'Timesheet', worker: t.worker, type: 'timesheet' });
  });

  // Personal Ledger
  const ledgerData = personalLedger.map(l => ({
    desc: getTitle(l), date: getDate(l,'Date'), person: getSelect(l,'Person'),
    type: getSelect(l,'Type'), debit: getNumber(l,'Debit')||0, credit: getNumber(l,'Credit')||0,
    method: getSelect(l,'Method'),
  }));
  // Group by person
  const ledgerByPerson = {};
  ledgerData.forEach(l => {
    if (!ledgerByPerson[l.person]) ledgerByPerson[l.person] = { entries: [], totalDebit: 0, totalCredit: 0 };
    ledgerByPerson[l.person].entries.push(l);
    ledgerByPerson[l.person].totalDebit += l.debit;
    ledgerByPerson[l.person].totalCredit += l.credit;
  });

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1a2e 0%, #141f35 100%)' }}>
      <ConstructionNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            <p className="text-sm mt-1" style={{ color: '#d4a853' }}>
              {selectedMonth ? monthLabel : new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </p>
          </div>
          <AddEntryModal triggerLabel="+ Add Entry" />
        </div>

        {/* Month Filter */}
        <div className="mb-6">
          <MonthFilter basePath="/" selected={selectedMonth} />
        </div>

        {/* KPIs Row 1 — always current */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KPI icon="💸" label="Pending Reimbursement" value={`${fmt(totalPendingReimb+totalPendingTsReimb)} DOP`} color="red" sub={`${pendingReimb.length} exp + ${pendingTsReimb.length} ts`} href="/clients" />
          <KPI icon="👷" label="Unpaid Workers" value={`${fmt(totalPendingTsPay)} DOP`} color="red" sub={`${pendingTsPay.length} timesheets`} href="/timesheets?filter=unpaid" />
          <KPI icon="📊" label={`${monthLabel} Expenses`} value={`${fmt(totalMonthExp)} DOP`} color="blue" sub={`${monthExp.length} entries`} href={selectedMonth ? `/expenses?month=${selectedMonth}` : '/expenses'} />
          <KPI icon="⏱️" label={`${monthLabel} Hours`} value={`${monthHours}h`} color="gold" sub={`${monthTs.length} entries`} href={selectedMonth ? `/timesheets?month=${selectedMonth}` : '/timesheets'} />
          <KPI icon="🏗️" label="Active Projects" value={projectData.filter(p=>['Active','On Site','Mobilizing'].includes(p.status)).length} color="green" sub={`${projectData.length} total`} href="/projects" />
        </div>

        {/* KPIs Row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <a href="/maintenance" className="rounded-xl p-5 block cursor-pointer hover:scale-[1.02] transition-all duration-200" style={{
            background: kmRemaining <= 1000 ? 'rgba(248,113,113,0.06)' : 'rgba(52,211,153,0.06)',
            border: `1px solid ${kmRemaining <= 1000 ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)'}`,
          }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚛</span>
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#94a3b8' }}>Camioneta</span>
            </div>
            <p className={`text-xl font-bold ${kmRemaining<=1000?'text-amber-400':'text-emerald-400'}`}>
              {fmt(kmRemaining)} km to service
            </p>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>
              {fmt(camKm)} km → next at {fmt(camNextKm)} km
            </p>
            {lastCam?.obs && !lastCam.obs.includes('Recordatorio') && (
              <p className="text-xs mt-1" style={{ color: '#d4a853' }}>📝 {lastCam.obs}</p>
            )}
          </a>
          <KPI icon="📋" label="Todo Costo Pendiente" value={`${fmt(todoData.reduce((s,t)=>s+Math.max(0,t.pending),0))} DOP`}
            color="gold" sub={`${todoData.length} projects`} href="/clients" />
          <KPI icon="🏢" label="Projects On Site" value={projectData.filter(p=>p.status==='On Site').length}
            color="blue" sub={`${projectData.filter(p=>p.status==='Active').length} active`} href="/projects" />
          <KPI icon="📅" label="This Week" value={`${allTimesheets.filter(t=>t.date>=weekAgo).length} entries`} color="green"
            sub={`${allExpenses.filter(e=>e.date>=weekAgo).length} expenses`} href="/timesheets" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent/Month Expenses */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-semibold text-white">{selectedMonth ? `${monthLabel} Expenses` : 'Recent Expenses'}</h3>
              <a href="/expenses" className="text-xs" style={{ color: '#d4a853' }}>View all →</a>
            </div>
            <div>
              {recentExp.slice(0,8).map((e,i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{e.desc}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{e.date}{e.client && ` · ${e.client}`} · <span style={{ color: '#d4a853' }}>{e.category}</span></p>
                  </div>
                  <span className="text-sm font-semibold text-white ml-4 font-mono">{fmt(e.amount)}</span>
                </div>
              ))}
              {recentExp.length===0 && <p className="px-6 py-8 text-center text-sm" style={{ color: '#64748b' }}>No expenses.</p>}
            </div>
          </div>

          {/* Expense by Category */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-semibold text-white">Expenses by Category <span className="text-xs font-normal" style={{ color: '#64748b' }}>{monthLabel}</span></h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              {catSorted.map(([cat,amt],i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: '#94a3b8' }}>{cat}</span>
                    <span className="font-mono text-white">{fmt(amt)}</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${(amt/maxCat)*100}%`, background: 'linear-gradient(90deg, #d4a853, #c49a45)' }}></div>
                  </div>
                </div>
              ))}
              {catSorted.length===0 && <p className="text-center text-sm py-4" style={{ color: '#64748b' }}>No expenses.</p>}
            </div>
          </div>
        </div>

        {/* Todo Costo — full width */}
        <div className="rounded-xl overflow-hidden mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,168,83,0.2)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-lg font-semibold text-white">💼 A Todo Costo</h3>
            <a href="/projects" className="text-xs" style={{ color: '#d4a853' }}>View all →</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {todoData.map((t,i) => {
              const spent = t.budget - Math.max(0,t.pending);
              const pct = t.budget > 0 ? Math.round((spent/t.budget)*100) : 0;
              return (
                <div key={i} className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <span className="text-xs font-mono" style={{ color: t.pending>0 ? '#f87171' : '#6ee7b7' }}>
                      {t.pending>0 ? `${fmt(t.pending)} DOP` : '✓ Complete'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex-1 rounded-full h-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className={`h-2 rounded-full ${pct>=90?'bg-red-400':pct>=70?'bg-yellow-400':'bg-emerald-400'}`} style={{ width: `${Math.min(pct,100)}%` }}></div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#d4a853' }}>{pct}%</span>
                  </div>
                  <p className="text-xs" style={{ color: '#64748b' }}>{fmt(spent)} spent · {fmt(t.budget)} budget</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Todoist Tasks */}
        <div className="rounded-xl overflow-hidden mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-lg font-semibold text-white">✅ Tasks</h3>
            <a href="/tasks" className="text-xs" style={{ color: '#d4a853' }}>View all →</a>
          </div>
          <div className="px-6 py-3">
            <TodoistWidget compact={true} />
          </div>
        </div>

        {/* Pending Reimbursements by Client */}
        {Object.keys(reimbByClient).length > 0 && (
          <PendingReimbursements reimbByClient={reimbByClient} />
        )}

        {/* Unpaid Workers by Client > Worker */}
        {Object.keys(unpaidByClient).length > 0 && (
          <UnpaidWorkers unpaidByClient={unpaidByClient} pendingTsPayLength={pendingTsPay.length} />
        )}

        {/* Personal Ledger */}
        {Object.keys(ledgerByPerson).length > 0 && (
          <div className="rounded-xl overflow-hidden mb-8" style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.12)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(96,165,250,0.1)' }}>
              <h3 className="text-lg font-semibold text-blue-400">🤝 Personal Accounts</h3>
              <a href="/accounts" className="text-xs" style={{ color: '#d4a853' }}>View all →</a>
            </div>
            {Object.entries(ledgerByPerson).map(([person, data]) => {
              const net = data.totalDebit - data.totalCredit;
              return (
                <div key={person} className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-bold text-white">👤 {person}</span>
                    <div className="text-right shrink-0">
                      <span className={`text-base sm:text-lg font-bold font-mono ${net>0?'text-red-400':'text-white'}`}>{net>0?'+':''}{fmt(net)} DOP</span>
                      <p className="text-xs" style={{ color: '#64748b' }}>{net>0?`${person} owes you`:`You owe ${person}`}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap text-xs" style={{ color: '#94a3b8' }}>
                    <span>They owe: <span className="text-red-400 font-mono font-semibold">{fmt(data.totalDebit)}</span></span>
                    <span>You owe: <span className="text-white font-mono">{fmt(data.totalCredit)}</span></span>
                    <span>{data.entries.length} entries</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>
      <footer className="mt-12 py-6 text-center text-xs" style={{ borderTop: '1px solid rgba(212,168,83,0.1)', color: '#64748b' }}>
        Powered by <strong style={{ color: '#d4a853' }}>Construction OS 2.0</strong>
      </footer>
    </div>
  );
}

function KPI({ icon, label, value, color, sub, href }) {
  const colors = { red: 'text-red-400', green: 'text-emerald-400', blue: 'text-blue-400' };
  const Tag = href ? 'a' : 'div';
  return (
    <Tag href={href||undefined} className={`rounded-xl p-5 block ${href?'cursor-pointer hover:scale-[1.02] transition-all duration-200':''}`} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</span>
      </div>
      <p className={`text-xl font-bold ${colors[color]||''}`} style={color==='gold'?{color:'#d4a853'}:{}}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#64748b' }}>{sub}{href ? ' →' : ''}</p>}
    </Tag>
  );
}
