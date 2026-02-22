import { getDB } from '@/lib/config';
import { queryDB, buildNameMap, getTitle, getNumber, getSelect, getDate, getRelationId } from '@/lib/notion';
import ConstructionNav from '@/components/ConstructionNav';

export const dynamic = 'force-dynamic';

export default async function TimesheetsPage() {
  const fmt = (n) => { const a=Math.abs(n||0); return (n<0?'-':'')+a.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}); };

  let timesheets=[];
  let clientNames={}, peopleNames={}, projectNames={};
  try { clientNames = await buildNameMap(getDB('clients')); } catch(e){}
  try { peopleNames = await buildNameMap(getDB('people')); } catch(e){}
  try { projectNames = await buildNameMap(getDB('projects')); } catch(e){}
  try { timesheets=await queryDB(getDB('timesheets'),undefined,[{property:'Date',direction:'descending'}]); } catch(e){}

  const data = timesheets.map(t => ({
    task: getTitle(t), hours: getNumber(t,'Hours')||0, date: getDate(t,'Date'),
    status: getSelect(t,'Status'), empPay: getSelect(t,'Employee payment status'),
    amount: getNumber(t,'Fixed Amount')||0,
    worker: peopleNames[getRelationId(t,'Employee')] || '—',
    client: clientNames[getRelationId(t,'Client')] || '',
    project: projectNames[getRelationId(t,'Project')] || '',
  }));

  const totalHours = data.reduce((s,t)=>s+t.hours,0);
  const totalAmount = data.reduce((s,t)=>s+t.amount,0);
  const unpaid = data.filter(t=>t.empPay==='Not Paid');
  const totalUnpaid = unpaid.reduce((s,t)=>s+t.amount,0);

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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Timesheets</h2>
          <div className="flex gap-3">
            <Stat label="Total Hours" value={`${totalHours}h`} color="#d4a853" />
            <Stat label="Total Amount" value={`${fmt(totalAmount)} DOP`} color="#fff" />
            <Stat label="Unpaid" value={`${fmt(totalUnpaid)} DOP`} color="#f87171" />
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <TH>Date</TH><TH>Worker</TH><TH>Task</TH><TH>Client / Project</TH>
                  <TH align="right">Hours</TH><TH>Client Status</TH><TH>Employee Pay</TH><TH align="right">Amount</TH>
                </tr>
              </thead>
              <tbody>
                {data.map((t,i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className={t.empPay==='Not Paid' ? 'bg-red-500/5' : ''}>
                    <td className="py-2.5 px-4 whitespace-nowrap" style={{ color: '#94a3b8' }}>{t.date||'—'}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="text-sm font-semibold" style={{ color: '#d4a853' }}>{t.worker}</span>
                    </td>
                    <td className="py-2.5 px-4 text-white font-medium max-w-xs truncate">{t.task}</td>
                    <td className="py-2.5 px-4">
                      {t.client && <span className="text-xs font-medium text-white">{t.client}</span>}
                      {t.project && <span className="text-xs ml-1" style={{ color: '#64748b' }}>/ {t.project}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono" style={{ color: '#d4a853' }}>{t.hours}</td>
                    <td className="py-2.5 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(t.status)}`}>{t.status}</span></td>
                    <td className="py-2.5 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${payColor(t.empPay)}`}>{t.empPay}</span></td>
                    <td className={`py-2.5 px-4 text-right font-mono font-semibold ${t.amount > 0 ? 'text-white' : 'text-gray-600'}`}>{t.amount > 0 ? fmt(t.amount) : '—'}</td>
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
    <div className="rounded-lg px-4 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
      <p className="text-lg font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}
