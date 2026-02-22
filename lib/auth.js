import { cookies } from 'next/headers';

const ADMIN_PIN = process.env.ADMIN_PIN || '';

export async function getSession() {
  if (!ADMIN_PIN) return { isAdmin: true }; // No PIN = open access (demo)
  const jar = await cookies();
  const pin = jar.get('admin_pin')?.value;
  return { isAdmin: pin === ADMIN_PIN };
}

export async function login(pin) {
  if (pin === ADMIN_PIN) {
    const jar = await cookies();
    jar.set('admin_pin', pin, { httpOnly: true, sameSite: 'lax', maxAge: 86400 * 30 });
    return true;
  }
  return false;
}
