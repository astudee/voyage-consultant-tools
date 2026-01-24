import { NextRequest, NextResponse } from 'next/server';
import { getSession, endSession, getSessionObservations, getObservationFlags } from '@/lib/snowflake-time-study';

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

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get observations with flags
    const observations = await getSessionObservations(sessionId);
    for (const obs of observations) {
      obs.flags = await getObservationFlags(obs.id);
    }

    return NextResponse.json({ session, observations });
  } catch (error) {
    console.error('API error fetching session:', error);
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
