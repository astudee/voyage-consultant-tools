import { NextRequest, NextResponse } from 'next/server';
import {
  getStudy,
  updateStudy,
  deleteStudy,
  getStudySteps,
  getStudyActivities,
  getStudyFlags,
  getStudyOutcomes,
} from '@/lib/snowflake-time-study';

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

    const study = await getStudy(studyId);
    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    // Get related data
    const [steps, activities, flags, outcomes] = await Promise.all([
      getStudySteps(studyId),
      getStudyActivities(studyId),
      getStudyFlags(studyId),
      getStudyOutcomes(studyId),
    ]);

    return NextResponse.json({
      study,
      steps,
      activities,
      flags,
      outcomes,
    });
  } catch (error) {
    console.error('API error fetching study:', error);
    return NextResponse.json(
      { error: 'Failed to fetch study', details: String(error) },
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
    await updateStudy(studyId, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error updating study:', error);
    return NextResponse.json(
      { error: 'Failed to update study', details: String(error) },
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

    await deleteStudy(studyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error deleting study:', error);
    return NextResponse.json(
      { error: 'Failed to delete study', details: String(error) },
      { status: 500 }
    );
  }
}
