import { NextRequest, NextResponse } from 'next/server';
import { getStudySessions, createSession } from '@/lib/snowflake-time-study';

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

    const sessions = await getStudySessions(studyId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('API error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: String(error) },
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
    const { observer_name, observed_worker_name, session_date, started_at, notes } = body;

    if (!observer_name || !observer_name.trim()) {
      return NextResponse.json({ error: 'Observer name is required' }, { status: 400 });
    }

    if (!session_date) {
      return NextResponse.json({ error: 'Session date is required' }, { status: 400 });
    }

    if (!started_at) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 });
    }

    const sessionId = await createSession(studyId, {
      observer_name: observer_name.trim(),
      observed_worker_name: observed_worker_name?.trim() || null,
      session_date,
      started_at,
      notes: notes || null,
    });

    return NextResponse.json({ id: sessionId, success: true }, { status: 201 });
  } catch (error) {
    console.error('API error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: String(error) },
      { status: 500 }
    );
  }
}
