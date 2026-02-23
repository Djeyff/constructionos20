import { getDB } from '@/lib/config';
import { queryDB, getTitle, getNumber } from '@/lib/notion';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [people, projects, clients] = await Promise.all([
      queryDB(getDB('people')),
      queryDB(getDB('projects')),
      queryDB(getDB('clients')),
    ]);

    const EXPENSE_CATEGORIES = [
      'Materials','Labor','Equipment','Utilities','Transport',
      'Supplies','Food/Meals','Professional Services','Other',
    ];
    const PROJECT_TYPES = ['Renovation','Construction','Maintenance','Design','Consulting','Other'];

    return NextResponse.json({
      people: people.map(p => ({ id: p.id, name: getTitle(p) })).filter(p=>p.name).sort((a,b)=>a.name.localeCompare(b.name)),
      projects: projects.map(p => ({ id: p.id, name: getTitle(p), status: p.properties?.Status?.select?.name||'' })).filter(p=>p.name).sort((a,b)=>a.name.localeCompare(b.name)),
      clients: clients.map(c => ({ id: c.id, name: getTitle(c) })).filter(c=>c.name).sort((a,b)=>a.name.localeCompare(b.name)),
      expenseCategories: EXPENSE_CATEGORIES,
      projectTypes: PROJECT_TYPES,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
