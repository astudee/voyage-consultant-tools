import { NextRequest, NextResponse } from 'next/server';
import { getStudyOutcomes, createStudyOutcome, deleteStudyOutcome } from '@/lib/snowflake-time-study';

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

    const outcomes = await getStudyOutcomes(studyId);
    return NextResponse.json({ outcomes });
  } catch (error) {
    console.error('API error fetching study outcomes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outcomes', details: String(error) },
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
    const { outcome_name } = body;

    if (!outcome_name || !outcome_name.trim()) {
      return NextResponse.json({ error: 'Outcome name is required' }, { status: 400 });
    }

    const outcomeId = await createStudyOutcome(studyId, {
      outcome_name: outcome_name.trim(),
    });

    return NextResponse.json({ id: outcomeId, success: true }, { status: 201 });
  } catch (error) {
    console.error('API error creating study outcome:', error);
    return NextResponse.json(
      { error: 'Failed to create outcome', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const { outcome_id } = body;

    if (!outcome_id) {
      return NextResponse.json({ error: 'outcome_id is required' }, { status: 400 });
    }

    await deleteStudyOutcome(outcome_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error deleting study outcome:', error);
    return NextResponse.json(
      { error: 'Failed to delete outcome', details: String(error) },
      { status: 500 }
    );
  }
}
