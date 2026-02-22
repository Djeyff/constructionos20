import { NextResponse } from 'next/server';
import { getDB } from '@/lib/config';
import { queryDB, getTitle } from '@/lib/notion';

export async function GET() {
  const results = {};
  const dbs = ['expenses','timesheets','projects','clients','people','todoCosto','mantPlantas','mantCamioneta'];
  for (const key of dbs) {
    const id = getDB(key);
    if (!id) { results[key] = 'no db id'; continue; }
    try {
      const rows = await queryDB(id, undefined, undefined, 2);
      const sample = rows.length > 0 ? getTitle(rows[0]) : 'empty';
      results[key] = `${rows.length} rows, sample: "${sample}"`;
    } catch(e) {
      results[key] = `ERROR: ${e.message.slice(0,200)}`;
    }
  }
  return NextResponse.json({ results });
}
