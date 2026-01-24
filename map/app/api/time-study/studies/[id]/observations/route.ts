import { NextRequest, NextResponse } from 'next/server';
import { getStudyObservations, createStudyObservation, deleteObservationsBulk } from '@/lib/snowflake-time-study';

// GET all observations for a study (for data grid view)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studyId = parseInt(id, 10);
    if (isNaN(studyId)) {
      return NextResponse.json({ error: 'Invalid study ID' }, { status: 400 });
    }

    const observations = await getStudyObservations(studyId);
    return NextResponse.json({ observations });
  } catch (error) {
    console.error('API error fetching study observations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch observations', details: String(error) },
      { status: 500 }
    );
  }
}

// POST a new observation (manual entry)
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

    // Validate required fields
    if (!body.session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }
    if (!body.started_at) {
      return NextResponse.json({ error: 'started_at is required' }, { status: 400 });
    }

    const observationId = await createStudyObservation(studyId, {
      session_id: body.session_id,
      study_activity_id: body.study_activity_id || null,
      adhoc_activity_name: body.adhoc_activity_name || null,
      started_at: body.started_at,
      ended_at: body.ended_at || null,
      total_duration_seconds: body.total_duration_seconds || null,
      outcome_id: body.outcome_id || null,
      notes: body.notes || null,
      opportunity: body.opportunity || null,
      flag_ids: body.flag_ids || [],
    });

    return NextResponse.json({ id: observationId, success: true });
  } catch (error) {
    console.error('API error creating observation:', error);
    return NextResponse.json(
      { error: 'Failed to create observation', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE multiple observations (bulk delete)
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
    const observationIds = body.observation_ids as number[];

    if (!observationIds || !Array.isArray(observationIds) || observationIds.length === 0) {
      return NextResponse.json({ error: 'observation_ids array is required' }, { status: 400 });
    }

    await deleteObservationsBulk(observationIds);

    return NextResponse.json({ success: true, deleted: observationIds.length });
  } catch (error) {
    console.error('API error deleting observations:', error);
    return NextResponse.json(
      { error: 'Failed to delete observations', details: String(error) },
      { status: 500 }
    );
  }
}
