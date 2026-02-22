'use client';
import { useState } from 'react';

export default function LoginForm() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    if (res.ok) { window.location.href = '/'; }
    else { setError('Invalid PIN'); setPin(''); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN"
        className="w-full px-4 py-3 rounded-lg text-center text-lg font-mono tracking-widest mb-3"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
      {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
      <button type="submit" className="w-full py-3 rounded-lg text-base font-bold transition-all"
        style={{ background: 'linear-gradient(135deg, #d4a853, #c49a45)', color: '#0f1a2e' }}>Enter</button>
    </form>
  );
}
