import { NextResponse } from 'next/server';
import fs from 'fs';

const TOKEN = (() => {
  try { return fs.readFileSync('/home/node/.openclaw/workspace/secrets/notion_token.txt', 'utf8').trim(); }
  catch { return process.env.NOTION_TOKEN || ''; }
})();

async function updatePage(pageId) {
  const cleanId = pageId.replace(/-/g, '');
  const formattedId = `${cleanId.slice(0,8)}-${cleanId.slice(8,12)}-${cleanId.slice(12,16)}-${cleanId.slice(16,20)}-${cleanId.slice(20)}`;

  const res = await fetch(`https://api.notion.com/v1/pages/${formattedId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties: { 'Employee payment status': { select: { name: 'Paid' } } } }),
  });
  return res.ok;
}

export async function POST(request) {
  try {
    const { pageIds } = await request.json();
    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json({ error: 'pageIds must be a non-empty array' }, { status: 400 });
    }
    if (pageIds.length > 50) {
      return NextResponse.json({ error: 'Too many pages' }, { status: 400 });
    }

    const results = await Promise.allSettled(pageIds.filter(id => id && typeof id === 'string').map(id => updatePage(id)));
    const updated = results.filter(r => r.status === 'fulfilled' && r.value).length;

    return NextResponse.json({ success: true, updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
