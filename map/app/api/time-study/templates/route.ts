import { NextResponse } from 'next/server';
import { getTemplates } from '@/lib/snowflake-time-study';

export async function GET() {
  try {
    const templates = await getTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('API error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', details: String(error) },
      { status: 500 }
    );
  }
}
