import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const { studyId } = await params;
    const id = parseInt(studyId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid study ID' }, { status: 400 });
    }

    console.log(`[DEBUG] Starting debug for study ${id}`);

    // 1. Get study
    const study = await executeQuery<Record<string, unknown>>(
      'SELECT * FROM time_studies WHERE id = ?',
      [id]
    );
    console.log(`[DEBUG] Study: ${JSON.stringify(study)}`);

    // 2. Get sessions for this study
    const sessions = await executeQuery<Record<string, unknown>>(
      'SELECT * FROM time_study_sessions WHERE study_id = ?',
      [id]
    );
    console.log(`[DEBUG] Sessions count: ${sessions.length}`);

    // 3. Get all session IDs
    const sessionIds = sessions.map((s) => s.ID as number);

    // 4. Get observations for these sessions
    let observations: Record<string, unknown>[] = [];
    if (sessionIds.length > 0) {
      // Use IN clause - need to build it dynamically
      const placeholders = sessionIds.map(() => '?').join(', ');
      observations = await executeQuery<Record<string, unknown>>(
        `SELECT * FROM time_study_observations WHERE session_id IN (${placeholders}) ORDER BY id`,
        sessionIds
      );
    }
    console.log(`[DEBUG] Observations count: ${observations.length}`);

    // 5. Get study activities
    const activities = await executeQuery<Record<string, unknown>>(
      'SELECT * FROM time_study_activities WHERE study_id = ?',
      [id]
    );
    console.log(`[DEBUG] Activities count: ${activities.length}`);

    // 6. Get study outcomes
    const outcomes = await executeQuery<Record<string, unknown>>(
      'SELECT * FROM time_study_outcomes WHERE study_id = ?',
      [id]
    );
    console.log(`[DEBUG] Outcomes count: ${outcomes.length}`);

    // 7. Run the summary SQL directly to see what we get
    const summaryRaw = await executeQuery<Record<string, unknown>>(
      `SELECT
        COUNT(DISTINCT ss.id) as session_count,
        COUNT(DISTINCT ss.observer_name) as observer_count,
        COUNT(o.id) as observation_count,
        AVG(o.total_duration_seconds) as avg_duration_seconds
      FROM time_study_sessions ss
      LEFT JOIN time_study_observations o ON o.session_id = ss.id
      WHERE ss.study_id = ?`,
      [id]
    );
    console.log(`[DEBUG] Summary raw: ${JSON.stringify(summaryRaw)}`);

    // 8. Run activity summary SQL directly
    const activitySummaryRaw = await executeQuery<Record<string, unknown>>(
      `SELECT
        COALESCE(a.activity_name, o.adhoc_activity_name, 'Unspecified') as activity_name,
        o.study_activity_id,
        COUNT(o.id) as observation_count,
        AVG(o.total_duration_seconds) as avg_duration_seconds
      FROM time_study_observations o
      JOIN time_study_sessions ss ON o.session_id = ss.id
      LEFT JOIN time_study_activities a ON o.study_activity_id = a.id
      WHERE ss.study_id = ?
      GROUP BY COALESCE(a.activity_name, o.adhoc_activity_name, 'Unspecified'), o.study_activity_id
      ORDER BY COUNT(o.id) DESC`,
      [id]
    );
    console.log(`[DEBUG] Activity summary raw: ${JSON.stringify(activitySummaryRaw)}`);

    // Return all debug info
    return NextResponse.json({
      studyId: id,
      study: study[0] || null,
      sessions: sessions.map((s) => ({
        id: s.ID,
        study_id: s.STUDY_ID,
        observer_name: s.OBSERVER_NAME,
        status: s.STATUS,
        session_date: s.SESSION_DATE,
      })),
      sessionCount: sessions.length,
      observations: observations.map((o) => ({
        id: o.ID,
        session_id: o.SESSION_ID,
        study_activity_id: o.STUDY_ACTIVITY_ID,
        adhoc_activity_name: o.ADHOC_ACTIVITY_NAME,
        observation_number: o.OBSERVATION_NUMBER,
        total_duration_seconds: o.TOTAL_DURATION_SECONDS,
        outcome_id: o.OUTCOME_ID,
      })),
      observationCount: observations.length,
      activities: activities.map((a) => ({
        id: a.ID,
        study_id: a.STUDY_ID,
        activity_name: a.ACTIVITY_NAME,
        is_active: a.IS_ACTIVE,
      })),
      activityCount: activities.length,
      outcomes: outcomes.map((o) => ({
        id: o.ID,
        outcome_name: o.OUTCOME_NAME,
      })),
      summaryRaw: summaryRaw[0] || null,
      activitySummaryRaw,
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json(
      { error: 'Debug query failed', details: String(error) },
      { status: 500 }
    );
  }
}
