const NOTION_TOKEN = process.env.NOTION_TOKEN;
const BASE = 'https://api.notion.com/v1';
const HEADERS = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

async function notionFetch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion ${res.status}: ${err}`);
  }
  return res.json();
}

export async function queryDB(dbId, filter = undefined, sorts = undefined, pageSize = 100) {
  if (!dbId) return [];
  const results = [];
  let cursor;
  do {
    const body = { page_size: pageSize };
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (cursor) body.start_cursor = cursor;
    const res = await notionFetch(`/databases/${dbId}/query`, body);
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return results;
}

export async function createPage(dbId, properties) {
  return notionFetch('/pages', { parent: { database_id: dbId }, properties });
}

export async function updatePage(pageId, properties) {
  const res = await fetch(`${BASE}/pages/${pageId}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ properties }),
  });
  return res.json();
}

// Property extractors
export function getTitle(page) {
  for (const p of Object.values(page.properties || {})) {
    if (p.type === 'title') return (p.title || []).map(t => t.plain_text).join('');
  }
  return '';
}

export function getNumber(page, key) {
  const p = page.properties?.[key];
  if (!p) return null;
  if (p.type === 'number') return p.number;
  if (p.type === 'formula') return p.formula?.type === 'number' ? p.formula.number : null;
  if (p.type === 'rollup') return p.rollup?.type === 'number' ? p.rollup.number : null;
  return null;
}

export function getText(page, key) {
  const p = page.properties?.[key];
  if (!p) return '';
  if (p.type === 'rich_text') return (p.rich_text || []).map(t => t.plain_text).join('');
  if (p.type === 'title') return (p.title || []).map(t => t.plain_text).join('');
  if (p.type === 'email') return p.email || '';
  if (p.type === 'phone_number') return p.phone_number || '';
  return '';
}

export function getSelect(page, key) {
  const p = page.properties?.[key];
  return p?.type === 'select' ? p.select?.name || '' : '';
}

export function getDate(page, key) {
  const p = page.properties?.[key];
  return p?.type === 'date' ? p.date?.start || null : null;
}

export function getRelationIds(page, key) {
  const p = page.properties?.[key];
  return p?.type === 'relation' ? (p.relation || []).map(r => r.id) : [];
}

export function getCheckbox(page, key) {
  const p = page.properties?.[key];
  return p?.type === 'checkbox' ? p.checkbox : false;
}
