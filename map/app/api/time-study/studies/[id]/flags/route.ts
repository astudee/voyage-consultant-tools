import { NextRequest, NextResponse } from 'next/server';
import { getStudyFlags, createStudyFlag } from '@/lib/snowflake-time-study';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studyId = parseInt(id, 10);
    if (isNaN(studyId)) {
      return NextResponse.json({ error: 'Invalid study ID' }, { status: 400 });
    }

    const flags = await getStudyFlags(studyId);
    return NextResponse.json({ flags });
  } catch (error) {
    console.error('API error fetching study flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flags', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studyId = parseInt(id, 10);
    if (isNaN(studyId)) {
      return NextResponse.json({ error: 'Invalid study ID' }, { status: 400 });
    }

    const body = await request.json();
    const { flag_name, is_standard } = body;

    if (!flag_name || !flag_name.trim()) {
      return NextResponse.json({ error: 'Flag name is required' }, { status: 400 });
    }

    const flagId = await createStudyFlag(studyId, {
      flag_name: flag_name.trim(),
      is_standard: is_standard || false,
    });

    return NextResponse.json({ id: flagId, success: true }, { status: 201 });
  } catch (error) {
    console.error('API error creating study flag:', error);
    return NextResponse.json(
      { error: 'Failed to create flag', details: String(error) },
      { status: 500 }
    );
  }
}
