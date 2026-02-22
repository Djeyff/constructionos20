import { NextResponse } from 'next/server';
import { getDB } from '@/lib/config';
import { queryDB } from '@/lib/notion';

export async function GET() {
  const results = {};
  const dbs = ['expenses','timesheets','projects','clients','people','todoCosto','mantPlantas','mantCamioneta'];
  for (const key of dbs) {
    const id = getDB(key);
    if (!id) { results[key] = 'no db id'; continue; }
    try {
      const rows = await queryDB(id, undefined, undefined, 1);
      results[key] = `${rows.length} rows (has_data: ${rows.length > 0})`;
    } catch(e) {
      results[key] = `ERROR: ${e.message}`;
    }
  }
  return NextResponse.json({
    hasConfig: !!process.env.CONSTRUCTION_CONFIG,
    hasNotion: !!process.env.NOTION_TOKEN,
    notionPrefix: (process.env.NOTION_TOKEN||'').slice(0,10)+'...',
    results,
  });
}
