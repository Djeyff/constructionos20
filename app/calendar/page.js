import { getDB } from '@/lib/config';
import { queryDB, buildNameMap, getTitle, getNumber, getSelect, getDate, getText, getRelationId } from '@/lib/notion';
import ConstructionNav from '@/components/ConstructionNav';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);

  let clientNames={}, projectNames={}, peopleNames={};
  try { clientNames = await buildNameMap(getDB('clients')); } catch(e){}
  try { projectNames = await buildNameMap(getDB('projects')); } catch(e){}
  try { peopleNames = await buildNameMap(getDB('people')); } catch(e){}

  let expenses=[], timesheets=[], mantCam=[], mantPlant=[], projects=[];
  try { expenses=await queryDB(getDB('expenses'),undefined,[{property:'Date',direction:'descending'}]); } catch(e){}
  try { timesheets=await queryDB(getDB('timesheets'),undefined,[{property:'Date',direction:'descending'}]); } catch(e){}
  try { mantCam=await queryDB(getDB('mantCamioneta'),undefined,[{property:'Fecha',direction:'descending'}]); } catch(e){}
  try { mantPlant=await queryDB(getDB('mantPlantas'),undefined,[{property:'Fecha',direction:'descending'}]); } catch(e){}
  try { projects=await queryDB(getDB('projects')); } catch(e){}

  // Build events
  const events = [];

  // Camioneta service
  const latestCam = mantCam[0];
  if (latestCam) {
    const nextDate = getDate(latestCam, 'Próxima Revisión');
    if (nextDate) events.push({ date: nextDate, title: '🚛 Camioneta Service', type: 'maintenance', color: 'red' });
  }

  // Project deadlines
  projects.forEach(p => {
    const end = getDate(p, 'End Date');
    const start = getDate(p, 'Start Date');
    const name = getTitle(p);
    const status = getSelect(p, 'Status');
    if (end && ['Active','On Site','Mobilizing','Punch List'].includes(status))
      events.push({ date: end, title: `🏗️ ${name} — Deadline`, type: 'project', color: 'blue' });
    if (start && ['Active','On Site','Mobilizing'].includes(status))
      events.push({ date: start, title: `🏗️ ${name} — Start`, type: 'project', color: 'green' });
  });

  // Plant maintenance
  mantPlant.forEach(p => {
    const date = getDate(p, 'Fecha');
    const plant = getSelect(p, 'Planta');
    const next = getText(p, 'Próxima Acción');
    if (date) events.push({ date, title: `🌿 ${plant}${next ? ': '+next : ''}`, type: 'maintenance', color: 'green' });
  });

  // Timesheets by date — aggregate hours per day
  const tsByDate = {};
  timesheets.forEach(t => {
    const d = getDate(t, 'Date');
    if (!d) return;
    const worker = peopleNames[getRelationId(t,'Employee')] || '';
    const client = clientNames[getRelationId(t,'Client')] || '';
    if (!tsByDate[d]) tsByDate[d] = { hours: 0, workers: new Set(), clients: new Set() };
    tsByDate[d].hours += getNumber(t, 'Hours') || 0;
    if (worker) tsByDate[d].workers.add(worker);
    if (client) tsByDate[d].clients.add(client);
  });
  Object.entries(tsByDate).forEach(([date, info]) => {
    const workers = [...info.workers].join(', ');
    events.push({ date, title: `⏱️ ${info.hours}h — ${workers}`, type: 'timesheet', color: 'gold' });
  });

  // Expenses by date — aggregate totals
  const expByDate = {};
  expenses.forEach(e => {
    const d = getDate(e, 'Date');
    if (!d) return;
    if (!expByDate[d]) expByDate[d] = { total: 0, count: 0 };
    expByDate[d].total += getNumber(e, 'Amount') || 0;
    expByDate[d].count++;
  });
  Object.entries(expByDate).forEach(([date, info]) => {
    const fmt2 = (n) => n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
    events.push({ date, title: `💸 ${fmt2(info.total)} DOP (${info.count})`, type: 'expense', color: 'red' });
  });

  events.sort((a, b) => a.date.localeCompare(b.date));

  // Build 6-week view
  const weeks = [];
  for (let w = -1; w < 5; w++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1 + w * 7);
    const days = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const dateStr = day.toISOString().slice(0, 10);
      days.push({
        date: dateStr, dayNum: day.getDate(),
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: day.toLocaleDateString('en-US', { month: 'short' }),
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        events: events.filter(e => e.date === dateStr),
      });
    }
    weeks.push(days);
  }

  const weekLabels = ['Last Week', 'This Week', 'Next Week', 'Week +2', 'Week +3', 'Week +4'];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1a2e 0%, #141f35 100%)' }}>
      <ConstructionNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Calendar</h2>

        {/* Day headers */}
        <div className="hidden sm:grid grid-cols-7 gap-2 mb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-center text-xs font-semibold uppercase" style={{ color: '#64748b' }}>{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>{weekLabels[wi]}</p>
            <div className="grid grid-cols-7 gap-2">
              {week.map((day, di) => (
                <div key={di} className="rounded-lg p-1.5 sm:p-2 min-h-[70px] sm:min-h-[90px]"
                  style={{
                    background: day.isToday ? 'rgba(212,168,83,0.12)' : day.isPast ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
                    border: day.isToday ? '1px solid rgba(212,168,83,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    opacity: day.isPast && !day.isToday ? 0.6 : 1,
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] hidden sm:inline" style={{ color: '#64748b' }}>{day.monthName}</span>
                    <span className={`text-xs sm:text-sm font-bold ${day.isToday ? '' : 'text-white'}`}
                      style={day.isToday ? { color: '#d4a853' } : {}}>{day.dayNum}</span>
                  </div>
                  {day.events.slice(0,3).map((ev, ei) => (
                    <div key={ei} className="mb-0.5 rounded px-1 py-0.5 text-[10px] sm:text-xs truncate"
                      style={{
                        background: ev.color==='gold'?'rgba(212,168,83,0.15)':ev.color==='red'?'rgba(248,113,113,0.15)':ev.color==='green'?'rgba(52,211,153,0.15)':'rgba(96,165,250,0.15)',
                        color: ev.color==='gold'?'#d4a853':ev.color==='red'?'#fca5a5':ev.color==='green'?'#6ee7b7':'#93c5fd',
                      }}>{ev.title}</div>
                  ))}
                  {day.events.length > 3 && <p className="text-[10px] text-center" style={{ color: '#64748b' }}>+{day.events.length-3}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Recent & Upcoming Events */}
        <div className="rounded-xl overflow-hidden mt-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-lg font-semibold text-white">Recent & Upcoming Activity</h3>
          </div>
          <div>
            {[...events].reverse().slice(0,30).map((ev, i) => {
              const isFuture = ev.date >= todayStr;
              const isToday = ev.date === todayStr;
              return (
                <div key={i} className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: !isFuture && !isToday ? 0.6 : 1 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{
                      background: ev.color==='gold'?'#d4a853':ev.color==='red'?'#f87171':ev.color==='green'?'#34d399':'#60a5fa'
                    }}></div>
                    <div>
                      <p className="text-sm text-white">{ev.title}</p>
                      <p className="text-xs" style={{ color: '#64748b' }}>{ev.date}{isToday ? ' · TODAY' : ''}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>{ev.type}</span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
