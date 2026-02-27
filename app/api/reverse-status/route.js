import { NextResponse } from 'next/server';
import fs from 'fs';

const TOKEN = (() => {
  try { return fs.readFileSync('/home/node/.openclaw/workspace/secrets/notion_token.txt', 'utf8').trim(); }
  catch { return process.env.NOTION_TOKEN || ''; }
})();

export async function POST(request) {
  try {
    const { pageId, field, value } = await request.json();
    if (!pageId || !field || !value) {
      return NextResponse.json({ error: 'pageId, field, value required' }, { status: 400 });
    }
    // Only allow specific safe field+value combos
    const allowed = {
      'Employee payment status': ['Not Paid', 'Paid'],
      'Status': ['Pending Reimbursement', 'Reimbursed'],
    };
    if (!allowed[field] || !allowed[field].includes(value)) {
      return NextResponse.json({ error: 'Invalid field/value' }, { status: 400 });
    }

    const cleanId = pageId.replace(/-/g, '');
    const fid = `${cleanId.slice(0,8)}-${cleanId.slice(8,12)}-${cleanId.slice(12,16)}-${cleanId.slice(16,20)}-${cleanId.slice(20)}`;

    const res = await fetch(`https://api.notion.com/v1/pages/${fid}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { [field]: { select: { name: value } } } }),
    });
    if (res.ok) return NextResponse.json({ success: true });
    return NextResponse.json({ error: 'Notion update failed' }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
