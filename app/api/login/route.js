import { login } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { pin } = await req.json();
  const ok = await login(pin);
  if (ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
}
