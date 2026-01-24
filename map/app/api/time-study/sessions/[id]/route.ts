import { NextRequest, NextResponse } from 'next/server';
import { getSession, endSession, getSessionObservations, getObservationFlags, ensureSchemaUpdates } from '@/lib/snowflake-time-study';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id, 10);
    console.log(`[Session GET] Fetching session ${sessionId}`);

    if (isNaN(sessionId)) {
      console.log(`[Session GET] Invalid session ID: ${id}`);
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    // Ensure schema is up to date (adds call_duration/acw_duration columns if needed)
    await ensureSchemaUpdates();

    const session = await getSession(sessionId);
    if (!session) {
      console.log(`[Session GET] Session not found: ${sessionId}`);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    console.log(`[Session GET] Found session: ${session.id}, study_id: ${session.study_id}`);

    // Get observations with flags
    const observations = await getSessionObservations(sessionId);
    console.log(`[Session GET] Found ${observations.length} observations`);

    for (const obs of observations) {
      obs.flags = await getObservationFlags(obs.id);
    }

    console.log(`[Session GET] Returning session with ${observations.length} observations`);
    return NextResponse.json({ session, observations });
  } catch (error) {
    console.error('[Session GET] Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { action, status, notes, ended_at } = body;

    // Support both action='end' and status='completed'
    if (action === 'end' || status === 'completed') {
      await endSession(sessionId, notes);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action or status' }, { status: 400 });
  } catch (error) {
    console.error('API error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session', details: String(error) },
      { status: 500 }
    );
  }
}
