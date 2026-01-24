import { NextRequest, NextResponse } from 'next/server';
import {
  getStudySummary,
  getStudyActivitySummary,
  getStudyStepSummary,
  getStudyFlagSummary,
  getStudyOpportunities,
  getStudyDispositionBreakdown,
  getStudy,
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

    // Get study to check structure type
    const study = await getStudy(studyId);
    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    // Get all summary data in parallel
    const [summary, activitySummary, flagSummary, opportunities, dispositionBreakdown] =
      await Promise.all([
        getStudySummary(studyId),
        getStudyActivitySummary(studyId),
        getStudyFlagSummary(studyId),
        getStudyOpportunities(studyId),
        getStudyDispositionBreakdown(studyId),
      ]);

    // Only get step summary for phases/segments studies
    let stepSummary = null;
    if (study.structure_type !== 'simple') {
      stepSummary = await getStudyStepSummary(studyId);
    }

    return NextResponse.json({
      study,
      summary,
      activitySummary,
      stepSummary,
      flagSummary,
      opportunities,
      dispositionBreakdown,
    });
  } catch (error) {
    console.error('API error fetching study summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch study summary', details: String(error) },
      { status: 500 }
    );
  }
}
