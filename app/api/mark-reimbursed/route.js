import { NextResponse } from 'next/server';
import fs from 'fs';

const TOKEN = (() => {
  try { return fs.readFileSync('/home/node/.openclaw/workspace/secrets/notion_token.txt', 'utf8').trim(); }
  catch { return process.env.NOTION_TOKEN || ''; }
})();

async function updatePage(pageId, type) {
  const cleanId = pageId.replace(/-/g, '');
  const formattedId = `${cleanId.slice(0,8)}-${cleanId.slice(8,12)}-${cleanId.slice(12,16)}-${cleanId.slice(16,20)}-${cleanId.slice(20)}`;
  
  // For expenses: Status → Reimbursed
  // For timesheets: Status → Reimbursed (NOT Employee payment status!)
  const properties = { 'Status': { select: { name: 'Reimbursed' } } };

  const res = await fetch(`https://api.notion.com/v1/pages/${formattedId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties }),
  });
  return res.ok;
}

export async function POST(request) {
  try {
    const { pageId, type } = await request.json();
    if (!pageId || typeof pageId !== 'string') {
      return NextResponse.json({ error: 'pageId required' }, { status: 400 });
    }
    const ok = await updatePage(pageId, type || 'expense');
    if (ok) return NextResponse.json({ success: true });
    return NextResponse.json({ error: 'Notion update failed' }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
