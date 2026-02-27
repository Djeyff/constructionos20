import { getDB } from '@/lib/config';
import { queryDB, buildNameMap, getTitle, getNumber, getSelect, getDate, getRelationId } from '@/lib/notion';
import ConstructionNav from '@/components/ConstructionNav';
import AddEntryModal from '@/components/AddEntryModal';
import WorkerFilter from '@/components/WorkerFilter';
import { MarkPaidButton, MarkReimbursedButton } from '@/components/ActionButtons';

export const dynamic = 'force-dynamic';

export default async function TimesheetsPage({ searchParams }) {
  const fmt = (n) => { const a=Math.abs(n||0); return (n<0?'-':'')+a.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}); };
  const params = await searchParams;
  const selectedWorker = params?.worker || null;

  let timesheets=[];
  let clientNames={}, peopleNames={}, projectNames={};
  try { clientNames = await buildNameMap(getDB('clients')); } catch(e){}
  try { peopleNames = await buildNameMap(getDB('people')); } catch(e){}
  try { projectNames = await buildNameMap(getDB('projects')); } catch(e){}
  try { timesheets=await queryDB(getDB('timesheets'),undefined,[{property:'Date',direction:'descending'}]); } catch(e){}

  const allData = timesheets.map(t => ({
    id: t.id,
    task: getTitle(t), hours: getNumber(t,'Hours')||0, date: getDate(t,'Date'),
    status: getSelect(t,'Status'), empPay: getSelect(t,'Employee payment status'),
    amount: getNumber(t,'Amount')||getNumber(t,'Fixed Amount')||0,
    workerId: getRelationId(t,'Employee'),
    worker: peopleNames[getRelationId(t,'Employee')] || '—',
    client: clientNames[getRelationId(t,'Client')] || '',
    project: projectNames[getRelationId(t,'Project')] || '',
  }));

  // Build worker list with totals
  const workerStats = {};
  allData.forEach(t => {
    const wk = t.worker;
    if (!workerStats[wk]) workerStats[wk] = { id: t.workerId, hours: 0, amount: 0, unpaid: 0, count: 0 };
    workerStats[wk].hours += t.hours;
    workerStats[wk].amount += t.amount;
    workerStats[wk].count++;
    if (t.empPay === 'Not Paid') workerStats[wk].unpaid += t.amount;
  });
  const workerList = Object.entries(workerStats).sort((a,b) => b[1].unpaid - a[1].unpaid);

  // Filter data
  const data = selectedWorker ? allData.filter(t => t.workerId === selectedWorker) : allData;

  const totalHours = data.reduce((s,t)=>s+t.hours,0);
  const totalAmount = data.reduce((s,t)=>s+t.amount,0);
  const unpaid = data.filter(t=>t.empPay==='Not Paid');
  const totalUnpaid = unpaid.reduce((s,t)=>s+t.amount,0);

  // Group by client for selected worker
  const byClient = {};
  if (selectedWorker) {
    data.forEach(t => {
      const c = t.client || 'Sin Cliente';
      if (!byClient[c]) byClient[c] = { items: [], hours: 0, amount: 0, unpaid: 0 };
      byClient[c].items.push(t);
      byClient[c].hours += t.hours;
      byClient[c].amount += t.amount;
      if (t.empPay === 'Not Paid') byClient[c].unpaid += t.amount;
    });
  }

  const selectedName = selectedWorker ? (Object.entries(workerStats).find(([_,v]) => v.id === selectedWorker)?.[0] || 'Worker') : null;

  const payColor = (s) => {
    if(s==='Paid') return 'bg-emerald-500/20 text-emerald-400';
    if(s==='Not Paid') return 'bg-red-500/20 text-red-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };
  const statusColor = (s) => {
    if(s==='Reimbursed'||s==='Paid by Client') return 'bg-emerald-500/20 text-emerald-400';
    if(s==='Pending Reimbursement'||s==='Pending Client Payment') return 'bg-amber-500/20 text-amber-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1a2e 0%, #141f35 100%)' }}>
      <ConstructionNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Timesheets</h2>
            {selectedName && <p className="text-sm mt-1" style={{ color: '#d4a853' }}>Filtered: {selectedName}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Stat label="Hours" value={`${totalHours}h`} color="#d4a853" />
            <Stat label="Total" value={`${fmt(totalAmount)}`} color="#fff" />
            <Stat label="Unpaid" value={`${fmt(totalUnpaid)}`} color="#f87171" />
            <AddEntryModal defaultType="timesheet" triggerLabel="+ Add" />
          </div>
        </div>

        {/* Worker Selector */}
        <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">👷 Filter by Worker</p>
            {selectedWorker && <a href="/timesheets" className="text-xs px-3 py-1 rounded-lg" style={{ color: '#d4a853', background: 'rgba(212,168,83,0.1)' }}>Show All</a>}
          </div>
          <WorkerFilter workers={workerList.map(([name, s]) => ({ name, id: s.id, hours: s.hours, unpaid: s.unpaid, count: s.count }))} selected={selectedWorker} />
        </div>

        {/* Worker Summary — grouped by client (when filtered) */}
        {selectedWorker && Object.keys(byClient).length > 0 && (
          <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
              <h3 className="text-lg font-semibold text-white">💰 {selectedName} — What You Owe</h3>
              <span className="text-lg font-bold text-red-400 font-mono">{fmt(totalUnpaid)} DOP</span>
            </div>
            {Object.entries(byClient).sort((a,b) => b[1].unpaid - a[1].unpaid).map(([client, info]) => (
              <div key={client}>
                <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-1" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-sm font-bold text-white">🏢 {client}</span>
                  <div className="flex gap-3 text-xs sm:text-sm font-mono">
                    <span style={{ color: '#d4a853' }}>{info.hours}h</span>
                    <span className="text-white">{fmt(info.amount)} total</span>
                    {info.unpaid > 0 && <span className="text-red-400 font-bold">{fmt(info.unpaid)} unpaid</span>}
                  </div>
                </div>
                {info.items.filter(t=>t.empPay==='Not Paid').map((t,i) => (
                  <div key={i} className="px-4 sm:px-6 pl-6 sm:pl-10 py-1.5 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <p className="text-xs flex-1 min-w-0" style={{ color: '#94a3b8' }}>{t.date} · {t.task} · {t.hours}h</p>
                    <span className={`text-xs font-mono shrink-0 ${t.amount > 0 ? 'text-red-400' : 'text-gray-600'}`}>{t.amount > 0 ? fmt(t.amount) : '—'}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'rgba(212,168,83,0.06)', borderTop: '2px solid rgba(212,168,83,0.15)' }}>
              <span className="text-sm font-bold" style={{ color: '#d4a853' }}>GRAND TOTAL OWED</span>
              <span className="text-lg font-bold text-red-400 font-mono">{fmt(totalUnpaid)} DOP</span>
            </div>
          </div>
        )}

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-2">
          {data.map((t,i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: t.empPay==='Not Paid' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-white flex-1">{t.task}</p>
                <span className={`text-sm font-mono font-bold shrink-0 ${t.amount > 0 ? 'text-white' : 'text-gray-600'}`}>{t.amount > 0 ? fmt(t.amount) : '—'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span style={{ color: '#94a3b8' }}>{t.date||'—'}</span>
                {!selectedWorker && t.worker && <span style={{ color: '#d4a853' }}>{t.worker}</span>}
                <span className="font-mono" style={{ color: '#d4a853' }}>{t.hours}h</span>
                {t.client && <span className="text-white">{t.client}{t.project ? ` / ${t.project}` : ''}</span>}
              </div>
              <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(t.status)}`}>{t.status}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${payColor(t.empPay)}`}>{t.empPay}</span>
                <MarkPaidButton pageId={t.id} currentStatus={t.empPay} />
                <MarkReimbursedButton pageId={t.id} type="timesheet" currentStatus={t.status} />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <TH>Date</TH>{!selectedWorker && <TH>Worker</TH>}<TH>Task</TH><TH>Client / Project</TH>
                  <TH align="right">Hours</TH><TH>Client Status</TH><TH>Employee Pay</TH><TH align="right">Amount</TH><TH>Actions</TH>
                </tr>
              </thead>
              <tbody>
                {data.map((t,i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className={t.empPay==='Not Paid' ? 'bg-red-500/5' : ''}>
                    <td className="py-2.5 px-4 whitespace-nowrap" style={{ color: '#94a3b8' }}>{t.date||'—'}</td>
                    {!selectedWorker && <td className="py-2.5 px-4 whitespace-nowrap"><span className="text-sm font-semibold" style={{ color: '#d4a853' }}>{t.worker}</span></td>}
                    <td className="py-2.5 px-4 text-white font-medium max-w-xs truncate">{t.task}</td>
                    <td className="py-2.5 px-4">
                      {t.client && <span className="text-xs font-medium text-white">{t.client}</span>}
                      {t.project && <span className="text-xs ml-1" style={{ color: '#64748b' }}>/ {t.project}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono" style={{ color: '#d4a853' }}>{t.hours}</td>
                    <td className="py-2.5 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(t.status)}`}>{t.status}</span></td>
                    <td className="py-2.5 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${payColor(t.empPay)}`}>{t.empPay}</span></td>
                    <td className={`py-2.5 px-4 text-right font-mono font-semibold ${t.amount > 0 ? 'text-white' : 'text-gray-600'}`}>{t.amount > 0 ? fmt(t.amount) : '—'}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex gap-1">
                        <MarkPaidButton pageId={t.id} currentStatus={t.empPay} />
                        <MarkReimbursedButton pageId={t.id} type="timesheet" currentStatus={t.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function TH({ children, align }) {
  return <th className={`${align==='right'?'text-right':'text-left'} py-3 px-4 text-xs font-semibold uppercase tracking-wider`} style={{ color: '#64748b' }}>{children}</th>;
}
function Stat({ label, value, color }) {
  return (
    <div className="rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
      <p className="text-sm sm:text-lg font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}
