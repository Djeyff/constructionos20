'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const GOLD = '#d4a853';
const DARK = 'rgba(255,255,255,0.04)';
const BORDER = '1px solid rgba(255,255,255,0.1)';
const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-white bg-transparent outline-none focus:ring-1';
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };
const labelCls = 'block text-xs font-semibold mb-1';

function Field({ label, children }) {
  return (
    <div>
      <label className={labelCls} style={{ color: '#94a3b8' }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', required }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      className={inputCls} style={{ ...inputStyle, '--tw-ring-color': GOLD }} />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={inputCls} style={{ ...inputStyle, color: value ? 'white' : '#64748b' }}>
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.id || o} value={o.id || o} style={{ background: '#1e2d4a', color: 'white' }}>
          {o.name || o}
        </option>
      ))}
    </select>
  );
}

export default function AddEntryModal({ defaultType = 'timesheet', triggerLabel, triggerClass }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(defaultType);
  const [lookup, setLookup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    task: '', employeeId: '', projectId: '', clientId: '',
    hours: '', amount: '', date: today,
    description: '', category: '', status: 'Pending Reimbursement',
    name: '', phone: '', email: '', rate: '', projectType: '', startDate: today,
  });
  const set = k => v => setF(p => ({ ...p, [k]: v }));

  const fetchLookup = useCallback(async () => {
    if (lookup) return;
    const r = await fetch('/api/lookup');
    setLookup(await r.json());
  }, [lookup]);

  useEffect(() => { if (open) fetchLookup(); }, [open, fetchLookup]);

  const reset = () => {
    setF({ task:'',employeeId:'',projectId:'',clientId:'',hours:'',amount:'',date:today,
           description:'',category:'',status:'Pending Reimbursement',
           name:'',phone:'',email:'',rate:'',projectType:'',startDate:today });
    setSuccess(false); setError('');
  };

  const close = () => { setOpen(false); reset(); };

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const body = { type, ...f };
      const r = await fetch('/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || 'Error');
      setSuccess(true);
      setTimeout(() => { close(); router.refresh(); }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const TYPES = [
    { key: 'timesheet', label: '⏱ Timesheet' },
    { key: 'expense', label: '💸 Expense' },
    { key: 'client', label: '🏢 Client' },
    { key: 'project', label: '📋 Project' },
    { key: 'person', label: '👤 Person' },
  ];

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={triggerClass || 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90'}
        style={{ background: `linear-gradient(135deg, ${GOLD}, #b8902a)`, color: '#0f1a2e' }}>
        {triggerLabel || '+ Add Entry'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && close()}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(212,168,83,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(212,168,83,0.05)' }}>
              <h3 className="text-lg font-bold text-white">Add Entry</h3>
              <button onClick={close} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Type tabs */}
            <div className="px-6 pt-4 flex gap-2 flex-wrap">
              {TYPES.map(t => (
                <button key={t.key} onClick={() => { setType(t.key); reset(); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={type === t.key
                    ? { background: GOLD, color: '#0f1a2e' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="px-6 py-4 space-y-4">
              {success ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="text-emerald-400 font-semibold">Saved to Notion!</p>
                </div>
              ) : (
                <>
                  {/* TIMESHEET */}
                  {type === 'timesheet' && (<>
                    <Field label="Task / Activity *">
                      <Input value={f.task} onChange={set('task')} placeholder="e.g. Malla ciclónica primera parte" required />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Hours">
                        <Input type="number" value={f.hours} onChange={set('hours')} placeholder="6.5" />
                      </Field>
                      <Field label="Fixed Amount (DOP)">
                        <Input type="number" value={f.amount} onChange={set('amount')} placeholder="1200" />
                      </Field>
                    </div>
                    <Field label="Date *">
                      <Input type="date" value={f.date} onChange={set('date')} required />
                    </Field>
                    <Field label="Worker">
                      <Select value={f.employeeId} onChange={set('employeeId')} options={lookup?.people || []} placeholder="Select worker..." />
                    </Field>
                    <Field label="Project">
                      <Select value={f.projectId} onChange={set('projectId')} options={lookup?.projects || []} placeholder="Select project..." />
                    </Field>
                    <Field label="Client">
                      <Select value={f.clientId} onChange={set('clientId')} options={lookup?.clients || []} placeholder="Select client..." />
                    </Field>
                  </>)}

                  {/* EXPENSE */}
                  {type === 'expense' && (<>
                    <Field label="Description *">
                      <Input value={f.description} onChange={set('description')} placeholder="e.g. Ferretería Hnos. Esteban — Alambre" required />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Amount (DOP) *">
                        <Input type="number" value={f.amount} onChange={set('amount')} placeholder="1500" required />
                      </Field>
                      <Field label="Date *">
                        <Input type="date" value={f.date} onChange={set('date')} required />
                      </Field>
                    </div>
                    <Field label="Category">
                      <Select value={f.category} onChange={set('category')} options={(lookup?.expenseCategories||[]).map(c=>({id:c,name:c}))} placeholder="Select category..." />
                    </Field>
                    <Field label="Status">
                      <Select value={f.status} onChange={set('status')}
                        options={['Pending Reimbursement','Para Contador','Reimbursed'].map(s=>({id:s,name:s}))}
                        placeholder="Select status..." />
                    </Field>
                    <Field label="Project">
                      <Select value={f.projectId} onChange={set('projectId')} options={lookup?.projects || []} placeholder="Select project..." />
                    </Field>
                    <Field label="Client">
                      <Select value={f.clientId} onChange={set('clientId')} options={lookup?.clients || []} placeholder="Select client..." />
                    </Field>
                  </>)}

                  {/* CLIENT */}
                  {type === 'client' && (<>
                    <Field label="Client Name *">
                      <Input value={f.name} onChange={set('name')} placeholder="e.g. CaseDamare" required />
                    </Field>
                    <Field label="Phone">
                      <Input value={f.phone} onChange={set('phone')} placeholder="809-000-0000" />
                    </Field>
                    <Field label="Email">
                      <Input type="email" value={f.email} onChange={set('email')} placeholder="client@email.com" />
                    </Field>
                  </>)}

                  {/* PROJECT */}
                  {type === 'project' && (<>
                    <Field label="Project Name *">
                      <Input value={f.name} onChange={set('name')} placeholder="e.g. Remodelación Oficina" required />
                    </Field>
                    <Field label="Client">
                      <Select value={f.clientId} onChange={set('clientId')} options={lookup?.clients || []} placeholder="Select client..." />
                    </Field>
                    <Field label="Type">
                      <Select value={f.projectType} onChange={set('projectType')} options={(lookup?.projectTypes||[]).map(t=>({id:t,name:t}))} placeholder="Select type..." />
                    </Field>
                    <Field label="Start Date">
                      <Input type="date" value={f.startDate} onChange={set('startDate')} />
                    </Field>
                  </>)}

                  {/* PERSON */}
                  {type === 'person' && (<>
                    <Field label="Name *">
                      <Input value={f.name} onChange={set('name')} placeholder="e.g. Juan" required />
                    </Field>
                    <Field label="Hourly Rate (DOP)">
                      <Input type="number" value={f.rate} onChange={set('rate')} placeholder="200" />
                    </Field>
                  </>)}

                  {error && <p className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                    style={{ background: loading ? 'rgba(212,168,83,0.5)' : `linear-gradient(135deg, ${GOLD}, #b8902a)`, color: '#0f1a2e' }}>
                    {loading ? 'Saving...' : `Save ${TYPES.find(t=>t.key===type)?.label}`}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
