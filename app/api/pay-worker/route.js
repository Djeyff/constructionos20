import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_TOKEN || 'ntn_FM1902323147EWoVqHsKxbuASUnFEcgXgbVMCCjeQWMdD2', // Fallback for dev, remove in prod
});

// Assuming the Employee payment status property ID is known or can be fetched
// For now, using property name "Employee payment status" - Notion API accepts names
export async function POST(request) {
  try {
    const { pageIds } = await request.json();

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json({ success: false, error: 'pageIds must be a non-empty array' }, { status: 400 });
    }

    if (pageIds.length > 50) { // Reasonable limit to prevent abuse
      return NextResponse.json({ success: false, error: 'Too many pages at once' }, { status: 400 });
    }

    const updates = [];
    for (const pageId of pageIds) {
      if (!pageId || typeof pageId !== 'string') {
        continue; // Skip invalid
      }

      // Clean Notion page ID (remove dashes if present)
      const cleanId = pageId.replace(/-/g, '');

      updates.push(
        notion.pages.update({
          page_id: cleanId,
          properties: {
            'Employee payment status': {
              select: {
                name: 'Paid',
              },
            },
          },
        })
      );
    }

    const results = await Promise.allSettled(updates);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    return NextResponse.json({ success: true, updated: successful });
  } catch (error) {
    console.error('Error updating worker payments:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
