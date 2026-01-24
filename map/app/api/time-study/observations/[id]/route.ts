import { NextRequest, NextResponse } from 'next/server';
import { getObservation, updateObservation, deleteObservation, ensureSchemaUpdates } from '@/lib/snowflake-time-study';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const observationId = parseInt(id, 10);
    if (isNaN(observationId)) {
      return NextResponse.json({ error: 'Invalid observation ID' }, { status: 400 });
    }

    // Ensure schema is up to date
    await ensureSchemaUpdates();

    const observation = await getObservation(observationId);
    if (!observation) {
      return NextResponse.json({ error: 'Observation not found' }, { status: 404 });
    }

    return NextResponse.json({ observation });
  } catch (error) {
    console.error('API error fetching observation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch observation', details: String(error) },
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
    const observationId = parseInt(id, 10);
    if (isNaN(observationId)) {
      return NextResponse.json({ error: 'Invalid observation ID' }, { status: 400 });
    }

    // Ensure schema is up to date
    await ensureSchemaUpdates();

    const body = await request.json();
    await updateObservation(observationId, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error updating observation:', error);
    return NextResponse.json(
      { error: 'Failed to update observation', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const observationId = parseInt(id, 10);
    if (isNaN(observationId)) {
      return NextResponse.json({ error: 'Invalid observation ID' }, { status: 400 });
    }

    await deleteObservation(observationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error deleting observation:', error);
    return NextResponse.json(
      { error: 'Failed to delete observation', details: String(error) },
      { status: 500 }
    );
  }
}
