import { getDB } from '@/lib/config';
import { queryDB, getTitle, getNumber, getSelect, getDate, getText } from '@/lib/notion';
import ConstructionNav from '@/components/ConstructionNav';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const fmt = (n) => { const a=Math.abs(n||0); return (n<0?'-':'')+a.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}); };

  let entries = [];
  try { entries = await queryDB(getDB('personalLedger'), undefined, [{property:'Date',direction:'ascending'}]); } catch(e){}

  const data = entries.map(l => ({
    desc: getTitle(l), date: getDate(l,'Date'), person: getSelect(l,'Person'),
    type: getSelect(l,'Type'), debit: getNumber(l,'Debit')||0, credit: getNumber(l,'Credit')||0,
    method: getSelect(l,'Method'), notes: getText(l,'Notes'),
  }));

  // Group by person with running balance
  const byPerson = {};
  data.forEach(l => {
    if (!byPerson[l.person]) byPerson[l.person] = { entries: [], totalDebit: 0, totalCredit: 0 };
    byPerson[l.person].totalDebit += l.debit;
    byPerson[l.person].totalCredit += l.credit;
    const running = byPerson[l.person].totalDebit - byPerson[l.person].totalCredit;
    byPerson[l.person].entries.push({ ...l, balance: running });
  });

  const grandDebit = data.reduce((s,l)=>s+l.debit,0);
  const grandCredit = data.reduce((s,l)=>s+l.credit,0);
  const grandNet = grandDebit - grandCredit;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1a2e 0%, #141f35 100%)' }}>
      <ConstructionNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Personal Accounts</h2>
          <div className="rounded-lg px-5 py-3" style={{
            background: grandNet > 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
            border: `1px solid ${grandNet > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
          }}>
            <span className="text-xs uppercase tracking-wide" style={{ color: '#64748b' }}>Net Balance</span>
            <p className={`text-2xl font-bold font-mono ${grandNet>0?'text-emerald-400':'text-red-400'}`}>
              {grandNet>0?'+':''}{fmt(grandNet)} <span className="text-sm">DOP</span>
            </p>
          </div>
        </div>

        {Object.entries(byPerson).map(([person, info]) => {
          const net = info.totalDebit - info.totalCredit;
          return (
            <div key={person} className="rounded-xl overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Person Header */}
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(96,165,250,0.05)', borderBottom: '1px solid rgba(96,165,250,0.1)' }}>
                <div>
                  <h3 className="text-lg font-bold text-white">👤 {person}</h3>
                  <div className="flex gap-4 text-xs mt-1" style={{ color: '#94a3b8' }}>
                    <span>They owe you: <span className="text-red-400 font-mono font-semibold">{fmt(info.totalDebit)}</span></span>
                    <span>You owe them: <span className="text-white font-mono font-semibold">{fmt(info.totalCredit)}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold font-mono ${net>0?'text-emerald-400':'text-red-400'}`}>
                    {net>0?'+':''}{fmt(net)} DOP
                  </p>
                  <p className="text-xs" style={{ color: '#64748b' }}>{net>0?`${person} owes you`:`You owe ${person}`}</p>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <TH>Date</TH><TH>Description</TH><TH>Method</TH>
                      <TH align="right">They Owe (Debit)</TH><TH align="right">You Owe (Credit)</TH><TH align="right">Balance</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {info.entries.map((e,i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="py-2.5 px-4 whitespace-nowrap" style={{ color: '#94a3b8' }}>{e.date||'—'}</td>
                        <td className="py-2.5 px-4 text-white font-medium">{e.desc}{e.notes && <span className="text-xs ml-2" style={{ color: '#64748b' }}>({e.notes})</span>}</td>
                        <td className="py-2.5 px-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(212,168,83,0.1)', color: '#d4a853' }}>{e.method}</span></td>
                        <td className="py-2.5 px-4 text-right font-mono text-red-400">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-white">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-semibold ${e.balance>0?'text-emerald-400':'text-red-400'}`}>
                          {e.balance>0?'+':''}{fmt(e.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(212,168,83,0.05)', borderTop: '2px solid rgba(212,168,83,0.15)' }}>
                      <td colSpan={3} className="py-3 px-4 text-right text-sm font-bold" style={{ color: '#d4a853' }}>Balance</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-400">{fmt(info.totalDebit)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">{fmt(info.totalCredit)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${net>0?'text-emerald-400':'text-red-400'}`}>
                        {net>0?'+':''}{fmt(net)} DOP
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}

        {Object.keys(byPerson).length === 0 && (
          <div className="rounded-xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-3xl mb-3">🤝</p>
            <p className="text-lg font-semibold text-white">No personal accounts yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function TH({ children, align }) {
  return <th className={`${align==='right'?'text-right':'text-left'} py-3 px-4 text-xs font-semibold uppercase tracking-wider`} style={{ color: '#64748b' }}>{children}</th>;
}
