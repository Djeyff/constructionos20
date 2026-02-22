import { getDB } from '@/lib/config';
import { queryDB, buildNameMap, getTitle, getNumber, getSelect, getDate, getRelationId } from '@/lib/notion';
import ConstructionNav from '@/components/ConstructionNav';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const fmt = (n) => { const a=Math.abs(n||0); return (n<0?'-':'')+a.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}); };

  let expenses=[];
  let clientNames={}, projectNames={};
  try { clientNames = await buildNameMap(getDB('clients')); } catch(e){}
  try { projectNames = await buildNameMap(getDB('projects')); } catch(e){}
  try { expenses=await queryDB(getDB('expenses'),undefined,[{property:'Date',direction:'descending'}]); } catch(e){}

  const data = expenses.map(e => ({
    desc: getTitle(e), amount: getNumber(e,'Amount')||0, date: getDate(e,'Date'),
    status: getSelect(e,'Status'), category: getSelect(e,'Category'), paidFrom: getSelect(e,'Paid From'),
    client: clientNames[getRelationId(e,'Client')] || '',
    project: projectNames[getRelationId(e,'Project')] || '',
  }));

  const total = data.reduce((s,e)=>s+e.amount,0);
  const pendingReimb = data.filter(e=>e.status==='Pending Reimbursement');
  const totalPending = pendingReimb.reduce((s,e)=>s+e.amount,0);

  const statusColor = (s) => {
    if(s==='Pending Reimbursement') return 'bg-red-500/20 text-red-400';
    if(s==='Reimbursed') return 'bg-emerald-500/20 text-emerald-400';
    if(s==='Paid') return 'bg-blue-500/20 text-blue-400';
    if(s==='Para Contador') return 'bg-purple-500/20 text-purple-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1a2e 0%, #141f35 100%)' }}>
      <ConstructionNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">All Expenses</h2>
          <div className="flex gap-3">
            <div className="rounded-lg px-4 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xs" style={{ color: '#64748b' }}>Total</span>
              <p className="text-lg font-bold text-white font-mono">{fmt(total)} <span className="text-xs font-normal" style={{ color: '#64748b' }}>DOP</span></p>
            </div>
            <div className="rounded-lg px-4 py-2" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
              <span className="text-xs text-red-400">Pending Reimbursement</span>
              <p className="text-lg font-bold text-red-400 font-mono">{fmt(totalPending)} <span className="text-xs font-normal" style={{ color: '#64748b' }}>DOP</span></p>
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <TH>Date</TH><TH>Description</TH><TH>Client / Project</TH><TH>Category</TH><TH>Status</TH><TH align="right">Amount</TH>
                </tr>
              </thead>
              <tbody>
                {data.map((e,i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className={e.status==='Pending Reimbursement' ? 'bg-red-500/5' : ''}>
                    <td className="py-2.5 px-4 whitespace-nowrap" style={{ color: '#94a3b8' }}>{e.date||'—'}</td>
                    <td className="py-2.5 px-4 text-white font-medium">{e.desc}</td>
                    <td className="py-2.5 px-4">
                      {e.client && <span className="text-xs font-medium text-white">{e.client}</span>}
                      {e.project && <span className="text-xs ml-1" style={{ color: '#64748b' }}>/ {e.project}</span>}
                      {!e.client && !e.project && <span style={{ color: '#64748b' }}>—</span>}
                    </td>
                    <td className="py-2.5 px-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(212,168,83,0.1)', color: '#d4a853' }}>{e.category}</span></td>
                    <td className="py-2.5 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(e.status)}`}>{e.status}</span></td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-white">{fmt(e.amount)}</td>
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
