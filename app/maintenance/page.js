import { getDB } from '@/lib/config';
import { queryDB, getTitle, getText, getNumber, getSelect, getDate } from '@/lib/notion';
import ConstructionNav from '@/components/ConstructionNav';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const fmt = (n) => (n||0).toLocaleString('en-US');

  let mantPlantas=[], mantCamioneta=[], mantGasolina=[];
  try { const db=getDB('mantPlantas'); if(db) mantPlantas=await queryDB(db,undefined,[{property:'Fecha',direction:'descending'}]); } catch(e){}
  try { const db=getDB('mantCamioneta'); if(db) mantCamioneta=await queryDB(db,undefined,[{property:'Fecha',direction:'descending'}]); } catch(e){}
  try { const db=getDB('mantGasolina'); if(db) mantGasolina=await queryDB(db,undefined,[{property:'Fecha',direction:'descending'}]); } catch(e){}

  const plantData = mantPlantas.map(p => ({
    entry: getTitle(p), date: getDate(p,'Fecha'), plant: getSelect(p,'Planta'),
    aceite: getSelect(p,'Aceite'), filtroAire: getSelect(p,'Filtro Aire'), filtroAceite: getSelect(p,'Filtro Aceite'),
    estado: getSelect(p,'Estado'), horas: getNumber(p,'Horas totales'),
    obs: getText(p,'Observaciones'), next: getText(p,'Próxima Acción'),
  }));

  const gasData = mantGasolina.map(g => ({
    entry: getTitle(g), date: getDate(g,'Fecha'), equipo: getSelect(g,'Equipo'),
    aceite: getSelect(g,'Aceite'), filtroAire: getSelect(g,'Filtro Aire'), filtroAceite: getSelect(g,'Filtro Aceite'),
    combustible: getSelect(g,'Combustible'), estado: getSelect(g,'Estado'),
    horas: getNumber(g,'Horas totales'),
    obs: getText(g,'Observaciones'), next: getText(g,'Próxima Acción'),
  }));

  const camData = mantCamioneta.map(c => ({
    entry: getTitle(c), date: getDate(c,'Fecha'), vehicle: getSelect(c,'Vehículo'),
    km: getNumber(c,'Odómetro (km)')||0, nextKm: getNumber(c,'Próximo km')||0,
    aceite: getSelect(c,'Aceite motor'), filtroAire: getSelect(c,'Filtro Aire'), filtroAceite: getSelect(c,'Filtro Aceite'),
    frenos: getSelect(c,'Frenos'), llantas: getSelect(c,'Llantas'),
    nivelAceite: getSelect(c,'Nivel Aceite'), colorAceite: getSelect(c,'Color Aceite'),
    refrigerante: getSelect(c,'Refrigerante'), aspectoGeneral: getSelect(c,'Aspecto General'),
    nextDate: getDate(c,'Próxima Revisión'), obs: getText(c,'Observaciones'),
  }));

  const latestCam = camData[0];
  const kmRemaining = latestCam ? latestCam.nextKm - latestCam.km : 0;

  // Next Saturday calculation
  const nextSaturday = (() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun, 6=Sat
    const daysUntilSat = day === 6 ? 7 : (6 - day);
    d.setDate(d.getDate() + daysUntilSat);
    return d.toISOString().slice(0,10);
  })();

  const statusIcon = (val) => {
    if(!val) return '—';
    if(val.includes('OK') || val.includes('Cambiado') || val.includes('✅') || val.includes('🔧')) return val;
    if(val.includes('Cambiar') || val.includes('⚠️')) return val;
    return val;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1a2e 0%, #141f35 100%)' }}>
      <ConstructionNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Equipment Maintenance</h2>

        {/* Camioneta Alert */}
        {latestCam && (
          <div className="rounded-xl p-6 mb-8" style={{
            background: kmRemaining <= 1000 ? 'rgba(248,113,113,0.05)' : 'rgba(52,211,153,0.05)',
            border: `1px solid ${kmRemaining <= 1000 ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">🚛 Camioneta — {latestCam.vehicle || 'Vehicle'}</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${kmRemaining<=1000?'bg-red-100 text-red-800':'bg-emerald-100 text-emerald-800'}`}>
                {kmRemaining <= 0 ? 'SERVICE OVERDUE' : `${fmt(kmRemaining)} km to service`}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
              <Stat label="Odometer" value={`${fmt(latestCam.km)} km`} />
              <Stat label="Next Service" value={`${fmt(latestCam.nextKm)} km`} />
              <Stat label="Aceite motor" value={statusIcon(latestCam.aceite)} />
              <Stat label="Nivel Aceite" value={statusIcon(latestCam.nivelAceite) || '—'} />
              <Stat label="Color Aceite" value={statusIcon(latestCam.colorAceite) || '—'} />
              <Stat label="Refrigerante" value={statusIcon(latestCam.refrigerante) || '—'} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Filtro Aire" value={statusIcon(latestCam.filtroAire)} />
              <Stat label="Filtro Aceite" value={statusIcon(latestCam.filtroAceite)} />
              <Stat label="Frenos" value={statusIcon(latestCam.frenos)} />
              <Stat label="Llantas" value={statusIcon(latestCam.llantas)} />
            </div>
            {latestCam.obs && <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>📝 {latestCam.obs}</p>}
            <p className="text-xs mt-3" style={{ color: '#64748b' }}>
              Last check: {latestCam.date} · 
              <span style={{ color: '#d4a853' }}> 📅 Next check-up: {nextSaturday} (Saturday)</span>
            </p>
          </div>
        )}

        {/* Plants */}
        <h3 className="text-xl font-bold text-white mb-4">🌿 Plantas (Generators)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Group by plant */}
          {['Casa de Simone', 'SportingClub'].map(plant => {
            const entries = plantData.filter(p => p.plant === plant);
            const latest = entries[0];
            if (!latest) return null;
            return (
              <div key={plant} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 className="text-base font-bold text-white mb-3">{plant}</h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <Stat label="Aceite" value={statusIcon(latest.aceite)} />
                  <Stat label="Filtro Aire" value={statusIcon(latest.filtroAire)} />
                  <Stat label="Filtro Aceite" value={statusIcon(latest.filtroAceite)} />
                </div>
                {latest.horas != null && (
                  <p className="text-xs mb-1 font-mono font-bold" style={{ color: '#d4a853' }}>⏱️ {latest.horas}h en medidor</p>
                )}
                <p className="text-xs" style={{ color: '#64748b' }}>Last: {latest.date} · Status: {latest.estado||'—'}</p>
                {latest.next && <p className="text-xs mt-1" style={{ color: '#d4a853' }}>Next: {latest.next}</p>}
                {latest.obs && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>📝 {latest.obs}</p>}

                {/* History */}
                {entries.length > 1 && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>History</p>
                    {entries.slice(1,5).map((e,i) => (
                      <p key={i} className="text-xs py-0.5" style={{ color: '#94a3b8' }}>
                        {e.date} — {e.aceite} · {e.filtroAire} · {e.filtroAceite}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Equipos Gasolina */}
        <>
            <h3 className="text-xl font-bold text-white mb-4 mt-8">⛽ Equipos Gasolina</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {['Planta pequeña gasolina', 'Motobomba gasolina'].map(equipo => {
                const entries = gasData.filter(g => g.equipo === equipo);
                const latest = entries[0];
                if (!latest) return (
                  <div key={equipo} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="text-base font-bold text-white mb-2">{equipo}</h4>
                    <p className="text-xs" style={{ color: '#64748b' }}>Sin registros</p>
                  </div>
                );
                return (
                  <div key={equipo} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="text-base font-bold text-white mb-3">{equipo}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <Stat label="Aceite" value={statusIcon(latest.aceite)} />
                      <Stat label="Filtro Aire" value={statusIcon(latest.filtroAire)} />
                      <Stat label="Filtro Aceite" value={statusIcon(latest.filtroAceite)} />
                      <Stat label="Combustible" value={statusIcon(latest.combustible)} />
                    </div>
                    {latest.horas != null && (
                      <div className="mb-2 px-3 py-1.5 rounded-lg inline-flex items-center gap-2" style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)' }}>
                        <span className="text-xs font-mono font-bold" style={{ color: '#d4a853' }}>⏱️ {latest.horas}h en medidor</span>
                      </div>
                    )}
                    <p className="text-xs" style={{ color: '#64748b' }}>Last: {latest.date} · Status: {latest.estado||'—'}</p>
                    {latest.next && <p className="text-xs mt-1" style={{ color: '#d4a853' }}>Next: {latest.next}</p>}
                    {latest.obs && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>📝 {latest.obs}</p>}
                    {entries.length > 1 && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>History</p>
                        {entries.slice(1,4).map((e,i) => (
                          <p key={i} className="text-xs py-0.5" style={{ color: '#94a3b8' }}>
                            {e.date} — {e.aceite} · {e.combustible}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        </>

        {/* Full Camioneta History */}
        {camData.length > 1 && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-semibold text-white">Camioneta History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#64748b' }}>Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#64748b' }}>KM</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#64748b' }}>Aceite</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#64748b' }}>F.Aire</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#64748b' }}>F.Aceite</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#64748b' }}>Frenos</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#64748b' }}>Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {camData.map((c,i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="py-2.5 px-4" style={{ color: '#94a3b8' }}>{c.date}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-white">{fmt(c.km)}</td>
                      <td className="py-2.5 px-4 text-white">{c.aceite}</td>
                      <td className="py-2.5 px-4 text-white">{c.filtroAire}</td>
                      <td className="py-2.5 px-4 text-white">{c.filtroAceite}</td>
                      <td className="py-2.5 px-4 text-white">{c.frenos}</td>
                      <td className="py-2.5 px-4 text-xs" style={{ color: '#94a3b8' }}>{c.obs||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <p className="text-xs" style={{ color: '#64748b' }}>{label}</p>
      <p className="text-sm font-semibold text-white">{value||'—'}</p>
    </div>
  );
}
