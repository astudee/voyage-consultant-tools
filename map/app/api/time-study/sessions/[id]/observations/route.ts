import { NextRequest, NextResponse } from 'next/server';
import { getSessionObservations, createObservation, createObservationStep } from '@/lib/snowflake-time-study';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id, 10);
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const observations = await getSessionObservations(sessionId);
    return NextResponse.json({ observations });
  } catch (error) {
    console.error('API error fetching observations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch observations', details: String(error) },
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
    const sessionId = parseInt(id, 10);
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      study_activity_id,
      adhoc_activity_name,
      observation_number,
      started_at,
      ended_at,
      total_duration_seconds,
      outcome_id,
      notes,
      opportunity,
      flag_ids,
      steps,
    } = body;

    if (!observation_number) {
      return NextResponse.json({ error: 'Observation number is required' }, { status: 400 });
    }

    if (!started_at) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 });
    }

    const observationId = await createObservation(sessionId, {
      study_activity_id: study_activity_id || null,
      adhoc_activity_name: adhoc_activity_name || null,
      observation_number,
      started_at,
      ended_at: ended_at || null,
      total_duration_seconds: total_duration_seconds || null,
      outcome_id: outcome_id || null,
      notes: notes || null,
      opportunity: opportunity || null,
      flag_ids: flag_ids || [],
    });

    // Create observation steps if provided
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await createObservationStep(observationId, {
          step_id: step.step_id,
          visit_number: step.visit_number || 1,
          started_at: step.started_at,
          ended_at: step.ended_at || null,
          duration_seconds: step.duration_seconds || null,
          sequence_in_observation: step.sequence_in_observation,
        });
      }
    }

    return NextResponse.json({ id: observationId, success: true }, { status: 201 });
  } catch (error) {
    console.error('API error creating observation:', error);
    return NextResponse.json(
      { error: 'Failed to create observation', details: String(error) },
      { status: 500 }
    );
  }
}
