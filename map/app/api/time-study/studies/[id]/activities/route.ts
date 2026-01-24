import { NextRequest, NextResponse } from 'next/server';
import { getStudyActivities, createStudyActivity, deleteStudyActivity, updateStudyActivity } from '@/lib/snowflake-time-study';

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

    const activities = await getStudyActivities(studyId);
    return NextResponse.json({ activities });
  } catch (error) {
    console.error('API error fetching study activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities', details: String(error) },
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
    const { workflow_activity_id, activity_name, is_adhoc } = body;

    if (!activity_name || !activity_name.trim()) {
      return NextResponse.json({ error: 'Activity name is required' }, { status: 400 });
    }

    const activityId = await createStudyActivity(studyId, {
      workflow_activity_id: workflow_activity_id || null,
      activity_name: activity_name.trim(),
      is_adhoc: is_adhoc || false,
    });

    return NextResponse.json({ id: activityId, success: true }, { status: 201 });
  } catch (error) {
    console.error('API error creating study activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity', details: String(error) },
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
    const { activity_id } = body;

    if (!activity_id) {
      return NextResponse.json({ error: 'activity_id is required' }, { status: 400 });
    }

    await deleteStudyActivity(activity_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error deleting study activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity', details: String(error) },
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
    const studyId = parseInt(id, 10);
    if (isNaN(studyId)) {
      return NextResponse.json({ error: 'Invalid study ID' }, { status: 400 });
    }

    const body = await request.json();
    const { activity_id, is_active } = body;

    if (!activity_id) {
      return NextResponse.json({ error: 'activity_id is required' }, { status: 400 });
    }

    await updateStudyActivity(activity_id, { is_active });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error updating study activity:', error);
    return NextResponse.json(
      { error: 'Failed to update activity', details: String(error) },
      { status: 500 }
    );
  }
}
