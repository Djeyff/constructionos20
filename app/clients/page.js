import { getDB } from '@/lib/config';
import { queryDB, buildNameMap, getTitle, getText, getNumber, getSelect, getDate, getRelationId } from '@/lib/notion';
import ConstructionNav from '@/components/ConstructionNav';
import AddEntryModal from '@/components/AddEntryModal';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const fmt = (n) => { const a=Math.abs(n||0); return (n<0?'-':'')+a.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}); };

  let clients=[], expenses=[], timesheets=[], tcProjects=[], tcAdvances=[];
  let clientNames={}, peopleNames={}, projectNames={};
  try { clientNames = await buildNameMap(getDB('clients')); } catch(e){}
  try { peopleNames = await buildNameMap(getDB('people')); } catch(e){}
  try { projectNames = await buildNameMap(getDB('projects')); } catch(e){}
  try { clients=await queryDB(getDB('clients')); } catch(e){}
  try { expenses=await queryDB(getDB('expenses'),{property:'Status',select:{equals:'Pending Reimbursement'}}); } catch(e){}
  try { timesheets=await queryDB(getDB('timesheets'),{property:'Status',select:{equals:'Pending Reimbursement'}}); } catch(e){}
  try { tcProjects=await queryDB(getDB('todoCosto')); } catch(e){}
  try { tcAdvances=await queryDB(getDB('todoCostoAvances'),{property:'Pagado por',select:{equals:'Jeff'}}); } catch(e){}

  // Build TC project map: id → { name, clientId, status }
  const tcProjectMap = {};
  tcProjects.forEach(p => {
    const cid = getRelationId(p,'Cliente');
    const status = getSelect(p,'Estado')||'';
    if (status === 'Pagado') return; // skip closed projects
    const budget = getNumber(p,'Presupuesto Total')||0;
    const pending = p.properties?.Pendiente?.formula?.number ?? null;
    const spent = pending !== null ? budget - Math.max(0, pending) : 0;
    const pct = budget > 0 ? Math.round((spent/budget)*100) : 0;
    tcProjectMap[p.id] = { name: getTitle(p), clientName: clientNames[cid]||'Sin Cliente', budget, pending: pending||0, spent, pct };
  });

  const clientData = clients.map(c => ({
    id: c.id, name: getTitle(c), phone: getText(c,'Phone')||'', email: getText(c,'Email')||'',
    priority: getSelect(c,'Priority')||'', billing: getSelect(c,'Billing Terms')||'',
  }));

  // Build grouped data: client > project > items
  const clientDebt = {};
  expenses.forEach(e => {
    const cid = getRelationId(e,'Client');
    const client = clientNames[cid] || 'Sin Cliente';
    const project = projectNames[getRelationId(e,'Project')] || 'General';
    const amount = getNumber(e,'Amount')||0;
    if (!clientDebt[client]) clientDebt[client] = {};
    if (!clientDebt[client][project]) clientDebt[client][project] = [];
    clientDebt[client][project].push({
      desc: getTitle(e), amount, date: getDate(e,'Date'),
      category: getSelect(e,'Category'), type: 'expense',
    });
  });
  timesheets.forEach(t => {
    const cid = getRelationId(t,'Client');
    const client = clientNames[cid] || 'Sin Cliente';
    const project = projectNames[getRelationId(t,'Project')] || 'General';
    const amount = getNumber(t,'Amount')||getNumber(t,'Fixed Amount')||0;
    if (!clientDebt[client]) clientDebt[client] = {};
    if (!clientDebt[client][project]) clientDebt[client][project] = [];
    clientDebt[client][project].push({
      desc: getTitle(t), amount, date: getDate(t,'Date'),
      worker: peopleNames[getRelationId(t,'Employee')] || '',
      hours: getNumber(t,'Hours')||0, type: 'timesheet',
    });
  });

  // Build TC project summary map: "client::project" → {budget, pending, spent, pct}
  const tcSummary = {};
  Object.values(tcProjectMap).forEach(tc => {
    tcSummary[`${tc.clientName}::${tc.name}`] = { budget: tc.budget, pending: tc.pending, spent: tc.spent, pct: tc.pct };
  });

  // Inject Todo Costo advances (paid by Jeff) into clientDebt
  tcAdvances.forEach(a => {
    const projId = getRelationId(a,'Todo Costo');
    const tc = tcProjectMap[projId];
    if (!tc) return;
    const client = tc.clientName;
    const project = tc.name;
    const amount = getNumber(a,'Monto')||0;
    if (!clientDebt[client]) clientDebt[client] = {};
    if (!clientDebt[client][project]) clientDebt[client][project] = [];
    clientDebt[client][project].push({
      desc: getTitle(a), amount, date: getDate(a,'Fecha'),
      paidBy: getSelect(a,'Pagado por')||'Jeff', type: 'advance',
    });
  });

  const grandTotal = Object.values(clientDebt).flatMap(p=>Object.values(p).flat()).reduce((s,e)=>s+e.amount,0);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1a2e 0%, #141f35 100%)' }}>
      <ConstructionNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Clients — Pending Reimbursements</h2>
          <div className="flex items-center gap-3">
            <div className="rounded-lg px-5 py-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <span className="text-xs text-red-400 uppercase tracking-wide">Total Owed</span>
              <p className="text-2xl font-bold text-red-400 font-mono">{fmt(grandTotal)} <span className="text-sm">DOP</span></p>
            </div>
            <AddEntryModal defaultType="client" triggerLabel="+ Add Client" />
          </div>
        </div>

        {/* Client Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {clientData.map((c,i) => {
            const debt = clientDebt[c.name] ? Object.values(clientDebt[c.name]).flat().reduce((s,e)=>s+e.amount,0) : 0;
            return (
              <div key={i} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-white">{c.name}</h3>
                  {debt > 0 && <span className="text-sm font-bold text-red-400 font-mono">{fmt(debt)}</span>}
                </div>
                <div className="space-y-1 text-xs" style={{ color: '#94a3b8' }}>
                  {c.phone && <p>📞 {c.phone}</p>}
                  {c.email && <p>✉️ {c.email}</p>}
                  {c.billing && <p>💳 {c.billing}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grouped Reimbursements: Client > Project > Items */}
        {Object.entries(clientDebt).sort((a,b) => {
          const ta = Object.values(a[1]).flat().reduce((s,e)=>s+e.amount,0);
          const tb = Object.values(b[1]).flat().reduce((s,e)=>s+e.amount,0);
          return tb - ta;
        }).map(([client, projects]) => {
          const clientTotal = Object.values(projects).flat().reduce((s,e)=>s+e.amount,0);
          // Calculate todo costo pendiente for this client (budget remaining not yet advanced)
          const clientTcPendiente = Object.keys(projects).reduce((s, proj) => {
            const tc = tcSummary[`${client}::${proj}`];
            return s + (tc ? tc.pending : 0);
          }, 0);
          const clientGrandTotal = clientTotal + clientTcPendiente;
          return (
            <div key={client} className="rounded-xl overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Client Header */}
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(212,168,83,0.05)', borderBottom: '1px solid rgba(212,168,83,0.1)' }}>
                <h3 className="text-lg font-bold text-white">🏢 {client}</h3>
                <span className="text-lg font-bold font-mono">
                  <span className="text-red-400">{fmt(clientTotal)}</span>
                  {clientTcPendiente > 0 && <span style={{ color: '#64748b' }}> / {fmt(clientGrandTotal)}</span>}
                  <span className="text-red-400"> DOP</span>
                </span>
              </div>

              {Object.entries(projects).sort((a,b) => {
                const ta = a[1].reduce((s,e)=>s+e.amount,0);
                const tb = b[1].reduce((s,e)=>s+e.amount,0);
                return tb - ta;
              }).map(([project, items]) => {
                const projTotal = items.reduce((s,e)=>s+e.amount,0);
                const tsItems = items.filter(e=>e.type==='timesheet');
                const expItems = items.filter(e=>e.type==='expense');
                const advItems = items.filter(e=>e.type==='advance');
                const tsTotal = tsItems.reduce((s,e)=>s+e.amount,0);
                const expTotal = expItems.reduce((s,e)=>s+e.amount,0);
                const advTotal = advItems.reduce((s,e)=>s+e.amount,0);
                return (
                  <div key={project}>
                    <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span className="text-sm font-semibold" style={{ color: '#d4a853' }}>📋 {project}</span>
                      <span className="text-sm font-semibold font-mono">
                        {(() => { const tc = tcSummary[`${client}::${project}`]; return tc && tc.budget > 0
                          ? <><span className="text-white">{fmt(projTotal)}</span><span style={{ color: '#64748b' }}> / {fmt(tc.budget)}</span><span className="text-white"> DOP</span></>
                          : <span className="text-white">{fmt(projTotal)} DOP</span>; })()}
                      </span>
                    </div>

                    {/* Timesheets */}
                    {tsItems.length > 0 && (
                      <div className="px-6 pl-10 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#d4a853' }}>⏱️ Timesheets <span className="font-mono">({fmt(tsTotal)} DOP)</span></p>
                        {tsItems.map((t,i) => (
                          <div key={i} className="flex items-center justify-between py-1">
                            <p className="text-xs" style={{ color: '#94a3b8' }}>
                              {t.worker && <span className="font-semibold text-white">{t.worker}: </span>}
                              {t.desc} ({t.hours}h) · {t.date}
                            </p>
                            <span className={`text-xs font-mono ${t.amount > 0 ? 'text-white' : 'text-gray-600'}`}>{t.amount > 0 ? fmt(t.amount) : '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expenses */}
                    {expItems.length > 0 && (
                      <div className="px-6 pl-10 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#d4a853' }}>💸 Expenses <span className="font-mono">({fmt(expTotal)} DOP)</span></p>
                        {expItems.map((e,i) => (
                          <div key={i} className="flex items-center justify-between py-1">
                            <p className="text-xs" style={{ color: '#94a3b8' }}>
                              {e.desc} · {e.date} · <span style={{ color: '#d4a853' }}>{e.category}</span>
                            </p>
                            <span className={`text-xs font-mono ${e.amount > 0 ? 'text-white' : 'text-gray-600'}`}>{e.amount > 0 ? fmt(e.amount) : '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* A Todo Costo Advances */}
                    {advItems.length > 0 && (() => {
                      const tc = tcSummary[`${client}::${project}`] || {};
                      return (
                        <div className="px-6 pl-10 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(212,168,83,0.02)' }}>
                          <p className="text-xs font-semibold mb-2" style={{ color: '#d4a853' }}>🔨 A Todo Costo — Avances</p>
                          {advItems.map((a,i) => (
                            <div key={i} className="flex items-center justify-between py-1">
                              <p className="text-xs" style={{ color: '#94a3b8' }}>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-900/50 text-blue-300 mr-2">
                                  👤 {a.paidBy}
                                </span>
                                {a.desc} · {a.date}
                              </p>
                              <span className="text-xs font-mono text-red-400 font-semibold">{fmt(a.amount)}</span>
                            </div>
                          ))}
                          {/* Project totals */}
                          {tc.budget > 0 && (
                            <div className="mt-3 pt-2 grid grid-cols-3 gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <div className="text-center">
                                <p className="text-xs" style={{ color: '#64748b' }}>Budget</p>
                                <p className="text-sm font-mono font-semibold text-white">{fmt(tc.budget)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs" style={{ color: '#64748b' }}>Spent</p>
                                <p className="text-sm font-mono font-semibold" style={{ color: '#d4a853' }}>{fmt(tc.spent)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs" style={{ color: '#64748b' }}>Pendiente</p>
                                <p className={`text-sm font-mono font-bold ${tc.pending > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(tc.pending)}</p>
                              </div>
                            </div>
                          )}
                          {tc.budget > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                  <div className={`h-1.5 rounded-full ${tc.pct>=90?'bg-red-400':tc.pct>=70?'bg-yellow-400':'bg-emerald-400'}`} style={{ width: `${Math.min(tc.pct,100)}%` }}></div>
                                </div>
                                <span className="text-xs font-bold" style={{ color: '#d4a853' }}>{tc.pct}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })}

        {Object.keys(clientDebt).length === 0 && (
          <div className="rounded-xl p-12 text-center" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <p className="text-3xl mb-3">✅</p>
            <p className="text-lg font-semibold text-emerald-400">No pending reimbursements!</p>
          </div>
        )}
      </main>
    </div>
  );
}
