import { NextResponse } from 'next/server';
import { getTshirtConfig } from '@/lib/snowflake';

export async function GET() {
  try {
    const config = await getTshirtConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('API error fetching t-shirt config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch t-shirt config', details: String(error) },
      { status: 500 }
    );
  }
}
