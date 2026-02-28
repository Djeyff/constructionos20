import { NextResponse } from 'next/server';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const EXPENSES_DB = 'b5cb4b86-9980-4935-a4e9-5c834de8ce41';
const TIMESHEETS_DB = '0aa7fab9-a129-4e44-9e5f-7b85553076c3';
const ADVANCES_DB = '30d00b56-b6fa-8185-8cdc-c5d3521f36a6';

async function notionQuery(dbId, filter) {
  let all = [], cursor;
  do {
    const body = { filter, page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json());
    all = all.concat(r.results || []);
    cursor = r.has_more ? r.next_cursor : null;
  } while (cursor);
  return all;
}

const nameCache = {};
async function resolveName(id) {
  if (nameCache[id]) return nameCache[id];
  try {
    const p = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28' }
    }).then(r => r.json());
    for (const k of Object.keys(p.properties || {})) {
      if (p.properties[k]?.type === 'title' && p.properties[k]?.title?.[0])
        return nameCache[id] = p.properties[k].title[0].text?.content || '?';
    }
  } catch (e) {}
  return '?';
}

export async function GET() {
  try {
    const [pendingExp, pendingTs, pendingAdv, contadorExp] = await Promise.all([
      notionQuery(EXPENSES_DB, { property: 'Status', select: { equals: 'Pending Reimbursement' } }),
      notionQuery(TIMESHEETS_DB, { property: 'Status', select: { equals: 'Pending Reimbursement' } }),
      notionQuery(ADVANCES_DB, { and: [
        { property: 'Pagado por', select: { equals: 'Jeff' } },
        { property: 'Reembolsado', select: { equals: 'Pendiente' } }
      ]}),
      notionQuery(EXPENSES_DB, { property: 'Status', select: { equals: 'Para Contador' } }),
    ]);

    const clientOwes = {};
    for (const e of pendingExp) {
      const amt = e.properties?.Amount?.number || 0;
      const rel = e.properties?.Client?.relation;
      const name = rel?.[0] ? await resolveName(rel[0].id) : 'Sin cliente';
      clientOwes[name] = (clientOwes[name] || 0) + amt;
    }
    for (const t of pendingTs) {
      const amt = t.properties?.Amount?.formula?.number || t.properties?.['Fixed Amount']?.number || 0;
      const rel = t.properties?.Client?.relation;
      const name = rel?.[0] ? await resolveName(rel[0].id) : 'Sin cliente';
      clientOwes[name] = (clientOwes[name] || 0) + amt;
    }
    for (const a of pendingAdv) {
      const amt = a.properties?.Monto?.number || 0;
      const rel = a.properties?.['Todo Costo']?.relation;
      const name = rel?.[0] ? await resolveName(rel[0].id) : 'Sin proyecto';
      clientOwes[name] = (clientOwes[name] || 0) + amt;
    }

    let supplierDebt = 0;
    const supplierItems = [];
    for (const e of contadorExp) {
      const amt = e.properties?.Amount?.number || 0;
      const title = e.properties?.Description?.title?.[0]?.text?.content || '?';
      const category = e.properties?.Category?.select?.name || '';
      const clientRel = e.properties?.Client?.relation;
      const clientName = clientRel?.[0] ? await resolveName(clientRel[0].id) : '';
      const kdriveUrl = e.properties?.kDrive?.url || null;
      // Split vendor from products: "Vendor — Products (Factura XXX)"
      let vendor = title, products = '';
      const dashIdx = title.indexOf('—');
      if (dashIdx > 0) {
        vendor = title.slice(0, dashIdx).trim();
        products = title.slice(dashIdx + 1).trim();
      }
      supplierDebt += amt;
      supplierItems.push({ vendor, products, client: clientName, category, kdriveUrl });
    }

    const totalOwed = Object.values(clientOwes).reduce((a, b) => a + b, 0);
    const clientBreakdown = Object.entries(clientOwes).sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name, amount }));
    const supplierBreakdown = supplierItems;

    return NextResponse.json({ totalOwed, supplierDebt, clientBreakdown, supplierBreakdown });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
