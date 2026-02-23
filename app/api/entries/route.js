import { getDB } from '@/lib/config';
import { NextResponse } from 'next/server';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const headers = () => ({
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
});

async function notionPost(path, body) {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === 'timesheet') {
      const { task, employeeId, projectId, clientId, hours, amount, date } = body;
      const props = {
        'Task/Activity': { title: [{ text: { content: task } }] },
        'Status': { select: { name: 'Pending Reimbursement' } },
        'Date': { date: { start: date } },
      };
      if (hours) props['Hours'] = { number: parseFloat(hours) };
      if (amount) props['Fixed Amount'] = { number: parseFloat(amount) };
      if (employeeId) props['Employee'] = { relation: [{ id: employeeId }] };
      if (projectId) props['Project'] = { relation: [{ id: projectId }] };
      if (clientId) props['Client'] = { relation: [{ id: clientId }] };
      const page = await notionPost('/pages', { parent: { database_id: getDB('timesheets') }, properties: props });
      return NextResponse.json({ ok: true, id: page.id });
    }

    if (type === 'expense') {
      const { description, amount, category, projectId, clientId, date, status } = body;
      const props = {
        'Description': { title: [{ text: { content: description } }] },
        'Amount': { number: parseFloat(amount) },
        'Date': { date: { start: date } },
        'Status': { select: { name: status || 'Pending Reimbursement' } },
      };
      if (category) props['Category'] = { select: { name: category } };
      if (projectId) props['Project'] = { relation: [{ id: projectId }] };
      if (clientId) props['Client'] = { relation: [{ id: clientId }] };
      const page = await notionPost('/pages', { parent: { database_id: getDB('expenses') }, properties: props });
      return NextResponse.json({ ok: true, id: page.id });
    }

    if (type === 'client') {
      const { name, phone, email } = body;
      const props = { 'Client Name': { title: [{ text: { content: name } }] } };
      if (phone) props['Phone'] = { phone_number: phone };
      if (email) props['Email'] = { email };
      const page = await notionPost('/pages', { parent: { database_id: getDB('clients') }, properties: props });
      return NextResponse.json({ ok: true, id: page.id, name });
    }

    if (type === 'project') {
      const { name, clientId, projectType, startDate } = body;
      const props = { 'Project Name': { title: [{ text: { content: name } }] } };
      if (projectType) props['Type'] = { select: { name: projectType } };
      if (startDate) props['Start Date'] = { date: { start: startDate } };
      if (clientId) props['Client'] = { relation: [{ id: clientId }] };
      const page = await notionPost('/pages', { parent: { database_id: getDB('projects') }, properties: props });
      return NextResponse.json({ ok: true, id: page.id, name });
    }

    if (type === 'person') {
      const { name, rate } = body;
      const props = { 'Person Name': { title: [{ text: { content: name } }] } };
      if (rate) props['Hourly Rate'] = { number: parseFloat(rate) };
      const page = await notionPost('/pages', { parent: { database_id: getDB('people') }, properties: props });
      return NextResponse.json({ ok: true, id: page.id, name });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
