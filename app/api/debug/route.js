import { NextResponse } from 'next/server';
import { getDB } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    hasConfig: !!process.env.CONSTRUCTION_CONFIG,
    hasNotion: !!process.env.NOTION_TOKEN,
    configLength: (process.env.CONSTRUCTION_CONFIG || '').length,
    expensesDB: getDB('expenses') ? 'set' : 'missing',
    timesheetsDB: getDB('timesheets') ? 'set' : 'missing',
    projectsDB: getDB('projects') ? 'set' : 'missing',
  });
}
