import { NextRequest, NextResponse } from 'next/server';
import {
  getStudySummary,
  getStudyActivitySummary,
  getStudyStepSummary,
  getStudyFlagSummary,
  getStudyOpportunities,
  getStudyDispositionBreakdown,
  getStudy,
  getContactCenterStats,
  ensureSchemaUpdates,
} from '@/lib/snowflake-time-study';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studyId = parseInt(id, 10);
    console.log(`[Summary API] Fetching summary for study ${studyId}`);

    // Ensure schema is up to date (for contact center stats)
    await ensureSchemaUpdates();

    if (isNaN(studyId)) {
      console.log(`[Summary API] Invalid study ID: ${id}`);
      return NextResponse.json({ error: 'Invalid study ID' }, { status: 400 });
    }

    // Get study to check structure type
    const study = await getStudy(studyId);
    if (!study) {
      console.log(`[Summary API] Study not found: ${studyId}`);
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }
    console.log(`[Summary API] Found study: ${study.study_name}, structure: ${study.structure_type}`);

    // Get all summary data in parallel
    console.log(`[Summary API] Fetching summary data...`);
    const [summary, activitySummary, flagSummary, opportunities, dispositionBreakdown] =
      await Promise.all([
        getStudySummary(studyId),
        getStudyActivitySummary(studyId),
        getStudyFlagSummary(studyId),
        getStudyOpportunities(studyId),
        getStudyDispositionBreakdown(studyId),
      ]);

    console.log(`[Summary API] summary:`, JSON.stringify(summary));
    console.log(`[Summary API] activitySummary count: ${activitySummary?.length || 0}`);
    console.log(`[Summary API] activitySummary:`, JSON.stringify(activitySummary));

    // Only get step summary for phases/segments studies
    let stepSummary = null;
    let contactCenterStats = null;
    if (study.structure_type !== 'simple') {
      stepSummary = await getStudyStepSummary(studyId);
      // Get contact center stats for phases studies
      if (study.structure_type === 'phases') {
        contactCenterStats = await getContactCenterStats(studyId);
        console.log(`[Summary API] contactCenterStats:`, JSON.stringify(contactCenterStats));
      }
    }

    const response = {
      study,
      summary,
      activitySummary,
      stepSummary,
      flagSummary,
      opportunities,
      dispositionBreakdown,
      contactCenterStats,
    };
    console.log(`[Summary API] Returning response with summary.observation_count: ${summary?.observation_count}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Summary API] Error fetching study summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch study summary', details: String(error) },
      { status: 500 }
    );
  }
}
