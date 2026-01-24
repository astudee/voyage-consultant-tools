import { executeQuery } from './snowflake';
import type {
  TimeStudyTemplate,
  TimeStudyTemplateStep,
  TimeStudy,
  TimeStudyInput,
  TimeStudyStep,
  TimeStudyStepInput,
  TimeStudyActivity,
  TimeStudyActivityInput,
  TimeStudyFlag,
  TimeStudyFlagInput,
  TimeStudyOutcome,
  TimeStudyOutcomeInput,
  TimeStudySession,
  TimeStudySessionInput,
  TimeStudyObservation,
  TimeStudyObservationInput,
  TimeStudyObservationStep,
  TimeStudyObservationStepInput,
  TimeStudySummary,
  TimeStudyActivitySummary,
  TimeStudyStepSummary,
  StructureType,
  StudyStatus,
  SessionStatus,
} from './time-study-types';

// Re-export types
export type {
  TimeStudyTemplate,
  TimeStudyTemplateStep,
  TimeStudy,
  TimeStudyInput,
  TimeStudyStep,
  TimeStudyStepInput,
  TimeStudyActivity,
  TimeStudyActivityInput,
  TimeStudyFlag,
  TimeStudyFlagInput,
  TimeStudyOutcome,
  TimeStudyOutcomeInput,
  TimeStudySession,
  TimeStudySessionInput,
  TimeStudyObservation,
  TimeStudyObservationInput,
  TimeStudyObservationStep,
  TimeStudyObservationStepInput,
  TimeStudySummary,
  TimeStudyActivitySummary,
  TimeStudyStepSummary,
  StructureType,
  StudyStatus,
  SessionStatus,
};

// Export StudyObservationRow type is defined inline in the file

// ============================================
// TEMPLATES
// ============================================

export async function getTemplates(): Promise<TimeStudyTemplate[]> {
  const sql = `
    SELECT id, template_name, description, structure_type, is_system_template, created_at, created_by
    FROM time_study_templates
    ORDER BY is_system_template DESC, template_name
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql);

  const templates: TimeStudyTemplate[] = rows.map((row) => ({
    id: row.ID as number,
    template_name: row.TEMPLATE_NAME as string,
    description: row.DESCRIPTION as string | null,
    structure_type: row.STRUCTURE_TYPE as StructureType,
    is_system_template: row.IS_SYSTEM_TEMPLATE as boolean,
    created_at: row.CREATED_AT as string | null,
    created_by: row.CREATED_BY as string | null,
  }));

  // Get steps for each template
  for (const template of templates) {
    template.steps = await getTemplateSteps(template.id);
  }

  return templates;
}

export async function getTemplate(templateId: number): Promise<TimeStudyTemplate | null> {
  const sql = `
    SELECT id, template_name, description, structure_type, is_system_template, created_at, created_by
    FROM time_study_templates
    WHERE id = ?
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [templateId]);
  if (rows.length === 0) return null;

  const row = rows[0];
  const template: TimeStudyTemplate = {
    id: row.ID as number,
    template_name: row.TEMPLATE_NAME as string,
    description: row.DESCRIPTION as string | null,
    structure_type: row.STRUCTURE_TYPE as StructureType,
    is_system_template: row.IS_SYSTEM_TEMPLATE as boolean,
    created_at: row.CREATED_AT as string | null,
    created_by: row.CREATED_BY as string | null,
  };

  template.steps = await getTemplateSteps(templateId);
  return template;
}

export async function getTemplateSteps(templateId: number): Promise<TimeStudyTemplateStep[]> {
  const sql = `
    SELECT id, template_id, step_name, sequence_order, is_required, created_at
    FROM time_study_template_steps
    WHERE template_id = ?
    ORDER BY sequence_order
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [templateId]);

  return rows.map((row) => ({
    id: row.ID as number,
    template_id: row.TEMPLATE_ID as number,
    step_name: row.STEP_NAME as string,
    sequence_order: row.SEQUENCE_ORDER as number,
    is_required: row.IS_REQUIRED as boolean,
    created_at: row.CREATED_AT as string | null,
  }));
}

// ============================================
// STUDIES
// ============================================

export async function getStudies(): Promise<TimeStudy[]> {
  const sql = `
    SELECT
      s.id, s.study_name, s.workflow_id, w.workflow_name,
      s.template_id, t.template_name,
      s.structure_type, s.status,
      s.created_at, s.created_by, s.modified_at, s.modified_by,
      COUNT(DISTINCT ss.id) as session_count,
      COUNT(o.id) as observation_count
    FROM time_studies s
    LEFT JOIN workflows w ON s.workflow_id = w.id
    LEFT JOIN time_study_templates t ON s.template_id = t.id
    LEFT JOIN time_study_sessions ss ON s.id = ss.study_id
    LEFT JOIN time_study_observations o ON ss.id = o.session_id
    GROUP BY s.id, s.study_name, s.workflow_id, w.workflow_name,
             s.template_id, t.template_name,
             s.structure_type, s.status,
             s.created_at, s.created_by, s.modified_at, s.modified_by
    ORDER BY s.modified_at DESC NULLS LAST, s.created_at DESC
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql);

  return rows.map((row) => ({
    id: row.ID as number,
    study_name: row.STUDY_NAME as string,
    workflow_id: row.WORKFLOW_ID as number | null,
    workflow_name: row.WORKFLOW_NAME as string | null,
    template_id: row.TEMPLATE_ID as number | null,
    template_name: row.TEMPLATE_NAME as string | null,
    structure_type: row.STRUCTURE_TYPE as StructureType,
    status: row.STATUS as StudyStatus,
    created_at: row.CREATED_AT as string | null,
    created_by: row.CREATED_BY as string | null,
    modified_at: row.MODIFIED_AT as string | null,
    modified_by: row.MODIFIED_BY as string | null,
    session_count: row.SESSION_COUNT as number,
    observation_count: row.OBSERVATION_COUNT as number,
  }));
}

export async function getStudy(studyId: number): Promise<TimeStudy | null> {
  const sql = `
    SELECT
      s.id, s.study_name, s.workflow_id, w.workflow_name,
      s.template_id, t.template_name,
      s.structure_type, s.status,
      s.created_at, s.created_by, s.modified_at, s.modified_by
    FROM time_studies s
    LEFT JOIN workflows w ON s.workflow_id = w.id
    LEFT JOIN time_study_templates t ON s.template_id = t.id
    WHERE s.id = ?
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.ID as number,
    study_name: row.STUDY_NAME as string,
    workflow_id: row.WORKFLOW_ID as number | null,
    workflow_name: row.WORKFLOW_NAME as string | null,
    template_id: row.TEMPLATE_ID as number | null,
    template_name: row.TEMPLATE_NAME as string | null,
    structure_type: row.STRUCTURE_TYPE as StructureType,
    status: row.STATUS as StudyStatus,
    created_at: row.CREATED_AT as string | null,
    created_by: row.CREATED_BY as string | null,
    modified_at: row.MODIFIED_AT as string | null,
    modified_by: row.MODIFIED_BY as string | null,
  };
}

export async function createStudy(data: TimeStudyInput): Promise<number> {
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM time_studies'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO time_studies (id, study_name, workflow_id, template_id, structure_type, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  await executeQuery(sql, [
    nextId,
    data.study_name,
    data.workflow_id || null,
    data.template_id || null,
    data.structure_type,
    data.status || 'active',
    'app_user',
  ]);

  return nextId;
}

export async function updateStudy(studyId: number, data: Partial<TimeStudyInput>): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.study_name !== undefined) {
    updates.push('study_name = ?');
    values.push(data.study_name);
  }
  if (data.workflow_id !== undefined) {
    updates.push('workflow_id = ?');
    values.push(data.workflow_id);
  }
  if (data.template_id !== undefined) {
    updates.push('template_id = ?');
    values.push(data.template_id);
  }
  if (data.structure_type !== undefined) {
    updates.push('structure_type = ?');
    values.push(data.structure_type);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }

  updates.push('modified_at = CURRENT_TIMESTAMP()');
  updates.push('modified_by = ?');
  values.push('app_user');
  values.push(studyId);

  const sql = `UPDATE time_studies SET ${updates.join(', ')} WHERE id = ?`;
  await executeQuery(sql, values);
}

export async function deleteStudy(studyId: number): Promise<void> {
  // Delete in order respecting foreign keys
  // First get all sessions for this study
  const sessions = await executeQuery<Record<string, unknown>>(
    'SELECT id FROM time_study_sessions WHERE study_id = ?',
    [studyId]
  );

  for (const session of sessions) {
    const sessionId = session.ID as number;
    // Delete observation steps and flags
    const observations = await executeQuery<Record<string, unknown>>(
      'SELECT id FROM time_study_observations WHERE session_id = ?',
      [sessionId]
    );
    for (const obs of observations) {
      const obsId = obs.ID as number;
      await executeQuery('DELETE FROM time_study_observation_steps WHERE observation_id = ?', [obsId]);
      await executeQuery('DELETE FROM time_study_observation_flags WHERE observation_id = ?', [obsId]);
    }
    await executeQuery('DELETE FROM time_study_observations WHERE session_id = ?', [sessionId]);
  }

  await executeQuery('DELETE FROM time_study_sessions WHERE study_id = ?', [studyId]);
  await executeQuery('DELETE FROM time_study_steps WHERE study_id = ?', [studyId]);
  await executeQuery('DELETE FROM time_study_activities WHERE study_id = ?', [studyId]);
  await executeQuery('DELETE FROM time_study_flags WHERE study_id = ?', [studyId]);
  await executeQuery('DELETE FROM time_study_outcomes WHERE study_id = ?', [studyId]);
  await executeQuery('DELETE FROM time_studies WHERE id = ?', [studyId]);
}

// ============================================
// STUDY STEPS
// ============================================

export async function getStudySteps(studyId: number): Promise<TimeStudyStep[]> {
  const sql = `
    SELECT id, study_id, step_name, sequence_order, is_required, created_at
    FROM time_study_steps
    WHERE study_id = ?
    ORDER BY sequence_order
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  return rows.map((row) => ({
    id: row.ID as number,
    study_id: row.STUDY_ID as number,
    step_name: row.STEP_NAME as string,
    sequence_order: row.SEQUENCE_ORDER as number,
    is_required: row.IS_REQUIRED as boolean,
    created_at: row.CREATED_AT as string | null,
  }));
}

export async function createStudyStep(studyId: number, data: TimeStudyStepInput): Promise<number> {
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM time_study_steps'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO time_study_steps (id, study_id, step_name, sequence_order, is_required)
    VALUES (?, ?, ?, ?, ?)
  `;

  await executeQuery(sql, [
    nextId,
    studyId,
    data.step_name,
    data.sequence_order,
    data.is_required || false,
  ]);

  return nextId;
}

export async function copyTemplateStepsToStudy(studyId: number, templateId: number): Promise<void> {
  const templateSteps = await getTemplateSteps(templateId);
  for (const step of templateSteps) {
    await createStudyStep(studyId, {
      step_name: step.step_name,
      sequence_order: step.sequence_order,
      is_required: step.is_required,
    });
  }
}

// ============================================
// STUDY ACTIVITIES
// ============================================

export async function getStudyActivities(studyId: number): Promise<TimeStudyActivity[]> {
  const sql = `
    SELECT id, study_id, workflow_activity_id, activity_name, is_adhoc, is_active, created_at
    FROM time_study_activities
    WHERE study_id = ?
    ORDER BY is_adhoc, activity_name
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  return rows.map((row) => ({
    id: row.ID as number,
    study_id: row.STUDY_ID as number,
    workflow_activity_id: row.WORKFLOW_ACTIVITY_ID as number | null,
    activity_name: row.ACTIVITY_NAME as string,
    is_adhoc: row.IS_ADHOC as boolean,
    is_active: row.IS_ACTIVE as boolean,
    created_at: row.CREATED_AT as string | null,
  }));
}

export async function createStudyActivity(studyId: number, data: TimeStudyActivityInput): Promise<number> {
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM time_study_activities'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO time_study_activities (id, study_id, workflow_activity_id, activity_name, is_adhoc, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  await executeQuery(sql, [
    nextId,
    studyId,
    data.workflow_activity_id || null,
    data.activity_name,
    data.is_adhoc || false,
    data.is_active !== false,
  ]);

  return nextId;
}

// ============================================
// STUDY FLAGS
// ============================================

export async function getStudyFlags(studyId: number): Promise<TimeStudyFlag[]> {
  const sql = `
    SELECT id, study_id, flag_name, is_standard, created_at
    FROM time_study_flags
    WHERE study_id = ?
    ORDER BY is_standard DESC, flag_name
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  return rows.map((row) => ({
    id: row.ID as number,
    study_id: row.STUDY_ID as number,
    flag_name: row.FLAG_NAME as string,
    is_standard: row.IS_STANDARD as boolean,
    created_at: row.CREATED_AT as string | null,
  }));
}

export async function createStudyFlag(studyId: number, data: TimeStudyFlagInput): Promise<number> {
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM time_study_flags'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO time_study_flags (id, study_id, flag_name, is_standard)
    VALUES (?, ?, ?, ?)
  `;

  await executeQuery(sql, [nextId, studyId, data.flag_name, data.is_standard || false]);
  return nextId;
}

// ============================================
// STUDY OUTCOMES
// ============================================

export async function getStudyOutcomes(studyId: number): Promise<TimeStudyOutcome[]> {
  const sql = `
    SELECT id, study_id, outcome_name, created_at
    FROM time_study_outcomes
    WHERE study_id = ?
    ORDER BY id
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  return rows.map((row) => ({
    id: row.ID as number,
    study_id: row.STUDY_ID as number,
    outcome_name: row.OUTCOME_NAME as string,
    created_at: row.CREATED_AT as string | null,
  }));
}

export async function createStudyOutcome(studyId: number, data: TimeStudyOutcomeInput): Promise<number> {
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM time_study_outcomes'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO time_study_outcomes (id, study_id, outcome_name)
    VALUES (?, ?, ?)
  `;

  await executeQuery(sql, [nextId, studyId, data.outcome_name]);
  return nextId;
}

// Helper to create default outcomes
export async function createDefaultOutcomes(studyId: number): Promise<void> {
  const defaultOutcomes = ['Complete', 'Transferred', 'Pended'];
  for (const name of defaultOutcomes) {
    await createStudyOutcome(studyId, { outcome_name: name });
  }
}

// Helper to create default flags
export async function createDefaultFlags(studyId: number): Promise<void> {
  const defaultFlags = [
    { flag_name: 'Automatable', is_standard: true },
    { flag_name: 'Exception', is_standard: true },
    { flag_name: 'Training Issue', is_standard: true },
  ];
  for (const flag of defaultFlags) {
    await createStudyFlag(studyId, flag);
  }
}

// ============================================
// SESSIONS
// ============================================

export async function getStudySessions(studyId: number): Promise<TimeStudySession[]> {
  const sql = `
    SELECT
      ss.id, ss.study_id, s.study_name,
      ss.observer_name, ss.observed_worker_name,
      ss.session_date, ss.started_at, ss.ended_at,
      ss.status, ss.notes, ss.created_at,
      COUNT(o.id) as observation_count,
      SUM(o.total_duration_seconds) as total_duration_seconds
    FROM time_study_sessions ss
    JOIN time_studies s ON ss.study_id = s.id
    LEFT JOIN time_study_observations o ON ss.id = o.session_id
    WHERE ss.study_id = ?
    GROUP BY ss.id, ss.study_id, s.study_name,
             ss.observer_name, ss.observed_worker_name,
             ss.session_date, ss.started_at, ss.ended_at,
             ss.status, ss.notes, ss.created_at
    ORDER BY ss.session_date DESC, ss.started_at DESC
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  return rows.map((row) => ({
    id: row.ID as number,
    study_id: row.STUDY_ID as number,
    study_name: row.STUDY_NAME as string,
    observer_name: row.OBSERVER_NAME as string,
    observed_worker_name: row.OBSERVED_WORKER_NAME as string | null,
    session_date: row.SESSION_DATE as string,
    started_at: row.STARTED_AT as string,
    ended_at: row.ENDED_AT as string | null,
    status: row.STATUS as SessionStatus,
    notes: row.NOTES as string | null,
    created_at: row.CREATED_AT as string | null,
    observation_count: row.OBSERVATION_COUNT as number,
    total_duration_seconds: row.TOTAL_DURATION_SECONDS as number | null,
  }));
}

export async function getSession(sessionId: number): Promise<TimeStudySession | null> {
  const sql = `
    SELECT
      ss.id, ss.study_id, s.study_name,
      ss.observer_name, ss.observed_worker_name,
      ss.session_date, ss.started_at, ss.ended_at,
      ss.status, ss.notes, ss.created_at
    FROM time_study_sessions ss
    JOIN time_studies s ON ss.study_id = s.id
    WHERE ss.id = ?
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [sessionId]);
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.ID as number,
    study_id: row.STUDY_ID as number,
    study_name: row.STUDY_NAME as string,
    observer_name: row.OBSERVER_NAME as string,
    observed_worker_name: row.OBSERVED_WORKER_NAME as string | null,
    session_date: row.SESSION_DATE as string,
    started_at: row.STARTED_AT as string,
    ended_at: row.ENDED_AT as string | null,
    status: row.STATUS as SessionStatus,
    notes: row.NOTES as string | null,
    created_at: row.CREATED_AT as string | null,
  };
}

export async function createSession(studyId: number, data: TimeStudySessionInput): Promise<number> {
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM time_study_sessions'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO time_study_sessions (id, study_id, observer_name, observed_worker_name, session_date, started_at, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?)
  `;

  await executeQuery(sql, [
    nextId,
    studyId,
    data.observer_name,
    data.observed_worker_name || null,
    data.session_date,
    data.started_at,
    data.notes || null,
  ]);

  return nextId;
}

export async function endSession(sessionId: number, notes?: string): Promise<void> {
  const sql = `
    UPDATE time_study_sessions
    SET ended_at = CURRENT_TIMESTAMP(), status = 'completed', notes = COALESCE(?, notes)
    WHERE id = ?
  `;
  await executeQuery(sql, [notes || null, sessionId]);
}

// ============================================
// OBSERVATIONS
// ============================================

export async function getSessionObservations(sessionId: number): Promise<TimeStudyObservation[]> {
  const sql = `
    SELECT
      o.id, o.session_id, o.study_activity_id,
      COALESCE(sa.activity_name, o.adhoc_activity_name) as activity_name,
      o.adhoc_activity_name, o.observation_number,
      o.started_at, o.ended_at, o.total_duration_seconds,
      o.call_duration_seconds, o.acw_duration_seconds,
      o.outcome_id, oc.outcome_name,
      o.notes, o.opportunity, o.created_at
    FROM time_study_observations o
    LEFT JOIN time_study_activities sa ON o.study_activity_id = sa.id
    LEFT JOIN time_study_outcomes oc ON o.outcome_id = oc.id
    WHERE o.session_id = ?
    ORDER BY o.observation_number
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [sessionId]);

  return rows.map((row) => ({
    id: row.ID as number,
    session_id: row.SESSION_ID as number,
    study_activity_id: row.STUDY_ACTIVITY_ID as number | null,
    activity_name: row.ACTIVITY_NAME as string | null,
    adhoc_activity_name: row.ADHOC_ACTIVITY_NAME as string | null,
    observation_number: row.OBSERVATION_NUMBER as number,
    started_at: row.STARTED_AT as string,
    ended_at: row.ENDED_AT as string | null,
    total_duration_seconds: row.TOTAL_DURATION_SECONDS as number | null,
    call_duration_seconds: row.CALL_DURATION_SECONDS as number | null,
    acw_duration_seconds: row.ACW_DURATION_SECONDS as number | null,
    outcome_id: row.OUTCOME_ID as number | null,
    outcome_name: row.OUTCOME_NAME as string | null,
    notes: row.NOTES as string | null,
    opportunity: row.OPPORTUNITY as string | null,
    created_at: row.CREATED_AT as string | null,
  }));
}

export async function getObservation(observationId: number): Promise<TimeStudyObservation | null> {
  const sql = `
    SELECT
      o.id, o.session_id, o.study_activity_id,
      COALESCE(sa.activity_name, o.adhoc_activity_name) as activity_name,
      o.adhoc_activity_name, o.observation_number,
      o.started_at, o.ended_at, o.total_duration_seconds,
      o.call_duration_seconds, o.acw_duration_seconds,
      o.outcome_id, oc.outcome_name,
      o.notes, o.opportunity, o.created_at
    FROM time_study_observations o
    LEFT JOIN time_study_activities sa ON o.study_activity_id = sa.id
    LEFT JOIN time_study_outcomes oc ON o.outcome_id = oc.id
    WHERE o.id = ?
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [observationId]);
  if (rows.length === 0) return null;

  const row = rows[0];
  const observation: TimeStudyObservation = {
    id: row.ID as number,
    session_id: row.SESSION_ID as number,
    study_activity_id: row.STUDY_ACTIVITY_ID as number | null,
    activity_name: row.ACTIVITY_NAME as string | null,
    adhoc_activity_name: row.ADHOC_ACTIVITY_NAME as string | null,
    observation_number: row.OBSERVATION_NUMBER as number,
    started_at: row.STARTED_AT as string,
    ended_at: row.ENDED_AT as string | null,
    total_duration_seconds: row.TOTAL_DURATION_SECONDS as number | null,
    call_duration_seconds: row.CALL_DURATION_SECONDS as number | null,
    acw_duration_seconds: row.ACW_DURATION_SECONDS as number | null,
    outcome_id: row.OUTCOME_ID as number | null,
    outcome_name: row.OUTCOME_NAME as string | null,
    notes: row.NOTES as string | null,
    opportunity: row.OPPORTUNITY as string | null,
    created_at: row.CREATED_AT as string | null,
  };

  // Get flags
  observation.flags = await getObservationFlags(observationId);

  // Get steps
  observation.steps = await getObservationSteps(observationId);

  return observation;
}

export async function createObservation(sessionId: number, data: TimeStudyObservationInput): Promise<number> {
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM time_study_observations'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO time_study_observations
    (id, session_id, study_activity_id, adhoc_activity_name, observation_number, started_at, ended_at, total_duration_seconds, call_duration_seconds, acw_duration_seconds, outcome_id, notes, opportunity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await executeQuery(sql, [
    nextId,
    sessionId,
    data.study_activity_id || null,
    data.adhoc_activity_name || null,
    data.observation_number,
    data.started_at,
    data.ended_at || null,
    data.total_duration_seconds || null,
    data.call_duration_seconds || null,
    data.acw_duration_seconds || null,
    data.outcome_id || null,
    data.notes || null,
    data.opportunity || null,
  ]);

  // Add flags if provided
  if (data.flag_ids && data.flag_ids.length > 0) {
    for (const flagId of data.flag_ids) {
      await executeQuery(
        'INSERT INTO time_study_observation_flags (observation_id, flag_id) VALUES (?, ?)',
        [nextId, flagId]
      );
    }
  }

  return nextId;
}

export async function updateObservation(observationId: number, data: Partial<TimeStudyObservationInput>): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.study_activity_id !== undefined) {
    updates.push('study_activity_id = ?');
    values.push(data.study_activity_id);
  }
  if (data.adhoc_activity_name !== undefined) {
    updates.push('adhoc_activity_name = ?');
    values.push(data.adhoc_activity_name);
  }
  if (data.ended_at !== undefined) {
    updates.push('ended_at = ?');
    values.push(data.ended_at);
  }
  if (data.total_duration_seconds !== undefined) {
    updates.push('total_duration_seconds = ?');
    values.push(data.total_duration_seconds);
  }
  if (data.call_duration_seconds !== undefined) {
    updates.push('call_duration_seconds = ?');
    values.push(data.call_duration_seconds);
  }
  if (data.acw_duration_seconds !== undefined) {
    updates.push('acw_duration_seconds = ?');
    values.push(data.acw_duration_seconds);
  }
  if (data.outcome_id !== undefined) {
    updates.push('outcome_id = ?');
    values.push(data.outcome_id);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(data.notes);
  }
  if (data.opportunity !== undefined) {
    updates.push('opportunity = ?');
    values.push(data.opportunity);
  }

  if (updates.length > 0) {
    values.push(observationId);
    const sql = `UPDATE time_study_observations SET ${updates.join(', ')} WHERE id = ?`;
    await executeQuery(sql, values);
  }

  // Update flags if provided
  if (data.flag_ids !== undefined) {
    await executeQuery('DELETE FROM time_study_observation_flags WHERE observation_id = ?', [observationId]);
    for (const flagId of data.flag_ids) {
      await executeQuery(
        'INSERT INTO time_study_observation_flags (observation_id, flag_id) VALUES (?, ?)',
        [observationId, flagId]
      );
    }
  }
}

// ============================================
// OBSERVATION FLAGS
// ============================================

export async function getObservationFlags(observationId: number): Promise<TimeStudyFlag[]> {
  const sql = `
    SELECT f.id, f.study_id, f.flag_name, f.is_standard, f.created_at
    FROM time_study_observation_flags of
    JOIN time_study_flags f ON of.flag_id = f.id
    WHERE of.observation_id = ?
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [observationId]);

  return rows.map((row) => ({
    id: row.ID as number,
    study_id: row.STUDY_ID as number,
    flag_name: row.FLAG_NAME as string,
    is_standard: row.IS_STANDARD as boolean,
    created_at: row.CREATED_AT as string | null,
  }));
}

// ============================================
// OBSERVATION STEPS
// ============================================

export async function getObservationSteps(observationId: number): Promise<TimeStudyObservationStep[]> {
  const sql = `
    SELECT os.id, os.observation_id, os.step_id, s.step_name,
           os.visit_number, os.started_at, os.ended_at, os.duration_seconds,
           os.sequence_in_observation, os.created_at
    FROM time_study_observation_steps os
    JOIN time_study_steps s ON os.step_id = s.id
    WHERE os.observation_id = ?
    ORDER BY os.sequence_in_observation
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [observationId]);

  return rows.map((row) => ({
    id: row.ID as number,
    observation_id: row.OBSERVATION_ID as number,
    step_id: row.STEP_ID as number,
    step_name: row.STEP_NAME as string,
    visit_number: row.VISIT_NUMBER as number,
    started_at: row.STARTED_AT as string,
    ended_at: row.ENDED_AT as string | null,
    duration_seconds: row.DURATION_SECONDS as number | null,
    sequence_in_observation: row.SEQUENCE_IN_OBSERVATION as number,
    created_at: row.CREATED_AT as string | null,
  }));
}

export async function createObservationStep(
  observationId: number,
  data: TimeStudyObservationStepInput
): Promise<number> {
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM time_study_observation_steps'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO time_study_observation_steps
    (id, observation_id, step_id, visit_number, started_at, ended_at, duration_seconds, sequence_in_observation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await executeQuery(sql, [
    nextId,
    observationId,
    data.step_id,
    data.visit_number || 1,
    data.started_at,
    data.ended_at || null,
    data.duration_seconds || null,
    data.sequence_in_observation,
  ]);

  return nextId;
}

export async function updateObservationStep(stepId: number, endedAt: string, durationSeconds: number): Promise<void> {
  const sql = `
    UPDATE time_study_observation_steps
    SET ended_at = ?, duration_seconds = ?
    WHERE id = ?
  `;
  await executeQuery(sql, [endedAt, durationSeconds, stepId]);
}

export async function deleteObservation(observationId: number): Promise<void> {
  // Delete observation steps and flags first
  await executeQuery('DELETE FROM time_study_observation_steps WHERE observation_id = ?', [observationId]);
  await executeQuery('DELETE FROM time_study_observation_flags WHERE observation_id = ?', [observationId]);
  await executeQuery('DELETE FROM time_study_observations WHERE id = ?', [observationId]);
}

export async function deleteObservationsBulk(observationIds: number[]): Promise<void> {
  if (observationIds.length === 0) return;

  const placeholders = observationIds.map(() => '?').join(',');

  // Delete observation steps and flags first
  await executeQuery(`DELETE FROM time_study_observation_steps WHERE observation_id IN (${placeholders})`, observationIds);
  await executeQuery(`DELETE FROM time_study_observation_flags WHERE observation_id IN (${placeholders})`, observationIds);
  await executeQuery(`DELETE FROM time_study_observations WHERE id IN (${placeholders})`, observationIds);
}

// Get all observations for a study (across all sessions) - for data grid view
export interface StudyObservationRow {
  id: number;
  session_id: number;
  session_observer_name: string;
  session_observed_worker: string | null;
  session_date: string;
  study_activity_id: number | null;
  activity_name: string | null;
  adhoc_activity_name: string | null;
  observation_number: number;
  started_at: string;
  ended_at: string | null;
  total_duration_seconds: number | null;
  call_duration_seconds: number | null;
  acw_duration_seconds: number | null;
  outcome_id: number | null;
  outcome_name: string | null;
  notes: string | null;
  opportunity: string | null;
  created_at: string | null;
  flag_ids: number[];
  flag_names: string[];
}

export async function getStudyObservations(studyId: number): Promise<StudyObservationRow[]> {
  const sql = `
    SELECT
      o.id, o.session_id,
      ss.observer_name as session_observer_name,
      ss.observed_worker_name as session_observed_worker,
      ss.session_date,
      o.study_activity_id,
      COALESCE(sa.activity_name, o.adhoc_activity_name) as activity_name,
      o.adhoc_activity_name, o.observation_number,
      o.started_at, o.ended_at, o.total_duration_seconds,
      o.call_duration_seconds, o.acw_duration_seconds,
      o.outcome_id, oc.outcome_name,
      o.notes, o.opportunity, o.created_at
    FROM time_study_observations o
    JOIN time_study_sessions ss ON o.session_id = ss.id
    LEFT JOIN time_study_activities sa ON o.study_activity_id = sa.id
    LEFT JOIN time_study_outcomes oc ON o.outcome_id = oc.id
    WHERE ss.study_id = ?
    ORDER BY o.id DESC
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  // Get all flags in one query for efficiency
  const flagsSql = `
    SELECT obs_flags.observation_id, f.id as flag_id, f.flag_name
    FROM time_study_observation_flags obs_flags
    JOIN time_study_flags f ON obs_flags.flag_id = f.id
    JOIN time_study_observations o ON obs_flags.observation_id = o.id
    JOIN time_study_sessions ss ON o.session_id = ss.id
    WHERE ss.study_id = ?
  `;
  const flagRows = await executeQuery<Record<string, unknown>>(flagsSql, [studyId]);

  // Build a map of observation_id -> flags
  const flagMap = new Map<number, { ids: number[]; names: string[] }>();
  for (const flagRow of flagRows) {
    const obsId = flagRow.OBSERVATION_ID as number;
    if (!flagMap.has(obsId)) {
      flagMap.set(obsId, { ids: [], names: [] });
    }
    flagMap.get(obsId)!.ids.push(flagRow.FLAG_ID as number);
    flagMap.get(obsId)!.names.push(flagRow.FLAG_NAME as string);
  }

  return rows.map((row) => {
    const obsId = row.ID as number;
    const flags = flagMap.get(obsId) || { ids: [], names: [] };
    return {
      id: obsId,
      session_id: row.SESSION_ID as number,
      session_observer_name: row.SESSION_OBSERVER_NAME as string,
      session_observed_worker: row.SESSION_OBSERVED_WORKER as string | null,
      session_date: row.SESSION_DATE as string,
      study_activity_id: row.STUDY_ACTIVITY_ID as number | null,
      activity_name: row.ACTIVITY_NAME as string | null,
      adhoc_activity_name: row.ADHOC_ACTIVITY_NAME as string | null,
      observation_number: row.OBSERVATION_NUMBER as number,
      started_at: row.STARTED_AT as string,
      ended_at: row.ENDED_AT as string | null,
      total_duration_seconds: row.TOTAL_DURATION_SECONDS as number | null,
      call_duration_seconds: row.CALL_DURATION_SECONDS as number | null,
      acw_duration_seconds: row.ACW_DURATION_SECONDS as number | null,
      outcome_id: row.OUTCOME_ID as number | null,
      outcome_name: row.OUTCOME_NAME as string | null,
      notes: row.NOTES as string | null,
      opportunity: row.OPPORTUNITY as string | null,
      created_at: row.CREATED_AT as string | null,
      flag_ids: flags.ids,
      flag_names: flags.names,
    };
  });
}

// Create an observation directly for a study (manual entry, not tied to live session)
export async function createStudyObservation(studyId: number, data: {
  session_id: number;
  study_activity_id?: number | null;
  adhoc_activity_name?: string | null;
  started_at: string;
  ended_at?: string | null;
  total_duration_seconds?: number | null;
  call_duration_seconds?: number | null;
  acw_duration_seconds?: number | null;
  outcome_id?: number | null;
  notes?: string | null;
  opportunity?: string | null;
  flag_ids?: number[];
}): Promise<number> {
  // Get the next observation number for this session
  const obsNumResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(observation_number), 0) + 1 as NEXT_NUM FROM time_study_observations WHERE session_id = ?',
    [data.session_id]
  );
  const nextObsNum = obsNumResult[0].NEXT_NUM as number;

  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM time_study_observations'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO time_study_observations
    (id, session_id, study_activity_id, adhoc_activity_name, observation_number, started_at, ended_at, total_duration_seconds, call_duration_seconds, acw_duration_seconds, outcome_id, notes, opportunity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await executeQuery(sql, [
    nextId,
    data.session_id,
    data.study_activity_id || null,
    data.adhoc_activity_name || null,
    nextObsNum,
    data.started_at,
    data.ended_at || null,
    data.total_duration_seconds || null,
    data.call_duration_seconds || null,
    data.acw_duration_seconds || null,
    data.outcome_id || null,
    data.notes || null,
    data.opportunity || null,
  ]);

  // Add flags if provided
  if (data.flag_ids && data.flag_ids.length > 0) {
    for (const flagId of data.flag_ids) {
      await executeQuery(
        'INSERT INTO time_study_observation_flags (observation_id, flag_id) VALUES (?, ?)',
        [nextId, flagId]
      );
    }
  }

  return nextId;
}

// ============================================
// SUMMARY / STATS
// ============================================

export async function getStudySummary(studyId: number): Promise<TimeStudySummary | null> {
  // Get study info first
  const studySql = `
    SELECT s.id, s.study_name, s.workflow_id, s.status,
           w.workflow_name
    FROM time_studies s
    LEFT JOIN workflows w ON s.workflow_id = w.id
    WHERE s.id = ?
  `;
  const studyRows = await executeQuery<Record<string, unknown>>(studySql, [studyId]);
  if (studyRows.length === 0) return null;
  const studyRow = studyRows[0];

  // Get aggregated stats from observations
  const statsSql = `
    SELECT
      COUNT(DISTINCT ss.id) as session_count,
      COUNT(DISTINCT ss.observer_name) as observer_count,
      COUNT(o.id) as observation_count,
      AVG(o.total_duration_seconds) as avg_duration_seconds,
      MEDIAN(o.total_duration_seconds) as median_duration_seconds,
      MIN(o.total_duration_seconds) as min_duration_seconds,
      MAX(o.total_duration_seconds) as max_duration_seconds,
      STDDEV(o.total_duration_seconds) as stddev_duration_seconds,
      MIN(ss.session_date) as first_session_date,
      MAX(ss.session_date) as last_session_date
    FROM time_study_sessions ss
    LEFT JOIN time_study_observations o ON o.session_id = ss.id
    WHERE ss.study_id = ?
  `;
  const statsRows = await executeQuery<Record<string, unknown>>(statsSql, [studyId]);
  const statsRow = statsRows[0] || {};

  return {
    study_id: studyRow.ID as number,
    study_name: studyRow.STUDY_NAME as string,
    workflow_id: studyRow.WORKFLOW_ID as number | null,
    workflow_name: studyRow.WORKFLOW_NAME as string | null,
    study_status: studyRow.STATUS as StudyStatus,
    session_count: (statsRow.SESSION_COUNT as number) || 0,
    observer_count: (statsRow.OBSERVER_COUNT as number) || 0,
    observation_count: (statsRow.OBSERVATION_COUNT as number) || 0,
    avg_duration_seconds: statsRow.AVG_DURATION_SECONDS as number | null,
    median_duration_seconds: statsRow.MEDIAN_DURATION_SECONDS as number | null,
    min_duration_seconds: statsRow.MIN_DURATION_SECONDS as number | null,
    max_duration_seconds: statsRow.MAX_DURATION_SECONDS as number | null,
    stddev_duration_seconds: statsRow.STDDEV_DURATION_SECONDS as number | null,
    first_session_date: statsRow.FIRST_SESSION_DATE as string | null,
    last_session_date: statsRow.LAST_SESSION_DATE as string | null,
  };
}

// Contact Center specific stats (for phases studies)
export interface ContactCenterStats {
  avg_call_duration_seconds: number | null;
  median_call_duration_seconds: number | null;
  min_call_duration_seconds: number | null;
  max_call_duration_seconds: number | null;
  avg_acw_duration_seconds: number | null;
  median_acw_duration_seconds: number | null;
  min_acw_duration_seconds: number | null;
  max_acw_duration_seconds: number | null;
  observations_with_acw: number;
  avg_aht_seconds: number | null;
}

export async function getContactCenterStats(studyId: number): Promise<ContactCenterStats | null> {
  const sql = `
    SELECT
      AVG(o.call_duration_seconds) as avg_call_duration_seconds,
      MEDIAN(o.call_duration_seconds) as median_call_duration_seconds,
      MIN(o.call_duration_seconds) as min_call_duration_seconds,
      MAX(o.call_duration_seconds) as max_call_duration_seconds,
      AVG(o.acw_duration_seconds) as avg_acw_duration_seconds,
      MEDIAN(o.acw_duration_seconds) as median_acw_duration_seconds,
      MIN(o.acw_duration_seconds) as min_acw_duration_seconds,
      MAX(o.acw_duration_seconds) as max_acw_duration_seconds,
      COUNT(CASE WHEN o.acw_duration_seconds IS NOT NULL THEN 1 END) as observations_with_acw,
      AVG(o.total_duration_seconds) as avg_aht_seconds
    FROM time_study_observations o
    JOIN time_study_sessions ss ON o.session_id = ss.id
    WHERE ss.study_id = ?
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    avg_call_duration_seconds: row.AVG_CALL_DURATION_SECONDS as number | null,
    median_call_duration_seconds: row.MEDIAN_CALL_DURATION_SECONDS as number | null,
    min_call_duration_seconds: row.MIN_CALL_DURATION_SECONDS as number | null,
    max_call_duration_seconds: row.MAX_CALL_DURATION_SECONDS as number | null,
    avg_acw_duration_seconds: row.AVG_ACW_DURATION_SECONDS as number | null,
    median_acw_duration_seconds: row.MEDIAN_ACW_DURATION_SECONDS as number | null,
    min_acw_duration_seconds: row.MIN_ACW_DURATION_SECONDS as number | null,
    max_acw_duration_seconds: row.MAX_ACW_DURATION_SECONDS as number | null,
    observations_with_acw: (row.OBSERVATIONS_WITH_ACW as number) || 0,
    avg_aht_seconds: row.AVG_AHT_SECONDS as number | null,
  };
}

export async function getStudyActivitySummary(studyId: number): Promise<TimeStudyActivitySummary[]> {
  // Get study name first
  const studySql = `SELECT study_name FROM time_studies WHERE id = ?`;
  const studyRows = await executeQuery<Record<string, unknown>>(studySql, [studyId]);
  const studyName = studyRows.length > 0 ? (studyRows[0].STUDY_NAME as string) : '';

  // Get activity summary - include both defined activities and ad-hoc ones
  const sql = `
    SELECT
      COALESCE(a.activity_name, o.adhoc_activity_name, 'Unspecified') as activity_name,
      COALESCE(a.is_adhoc, CASE WHEN o.adhoc_activity_name IS NOT NULL THEN TRUE ELSE FALSE END) as is_adhoc,
      COUNT(o.id) as observation_count,
      AVG(o.total_duration_seconds) as avg_duration_seconds,
      MEDIAN(o.total_duration_seconds) as median_duration_seconds,
      MIN(o.total_duration_seconds) as min_duration_seconds,
      MAX(o.total_duration_seconds) as max_duration_seconds,
      STDDEV(o.total_duration_seconds) as stddev_duration_seconds,
      SUM(CASE WHEN oc.outcome_name = 'Complete' THEN 1 ELSE 0 END) as complete_count,
      SUM(CASE WHEN oc.outcome_name = 'Transferred' THEN 1 ELSE 0 END) as transferred_count,
      SUM(CASE WHEN oc.outcome_name = 'Pended' THEN 1 ELSE 0 END) as pended_count
    FROM time_study_observations o
    JOIN time_study_sessions ss ON o.session_id = ss.id
    LEFT JOIN time_study_activities a ON o.study_activity_id = a.id
    LEFT JOIN time_study_outcomes oc ON o.outcome_id = oc.id
    WHERE ss.study_id = ?
    GROUP BY COALESCE(a.activity_name, o.adhoc_activity_name, 'Unspecified'),
             COALESCE(a.is_adhoc, CASE WHEN o.adhoc_activity_name IS NOT NULL THEN TRUE ELSE FALSE END)
    ORDER BY observation_count DESC
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  return rows.map((row) => ({
    study_id: studyId,
    study_name: studyName,
    activity_name: row.ACTIVITY_NAME as string,
    is_adhoc: row.IS_ADHOC as boolean,
    observation_count: (row.OBSERVATION_COUNT as number) || 0,
    avg_duration_seconds: row.AVG_DURATION_SECONDS as number | null,
    median_duration_seconds: row.MEDIAN_DURATION_SECONDS as number | null,
    min_duration_seconds: row.MIN_DURATION_SECONDS as number | null,
    max_duration_seconds: row.MAX_DURATION_SECONDS as number | null,
    stddev_duration_seconds: row.STDDEV_DURATION_SECONDS as number | null,
    complete_count: (row.COMPLETE_COUNT as number) || 0,
    transferred_count: (row.TRANSFERRED_COUNT as number) || 0,
    pended_count: (row.PENDED_COUNT as number) || 0,
  }));
}

export async function getStudyStepSummary(studyId: number): Promise<TimeStudyStepSummary[]> {
  // Get study name first
  const studySql = `SELECT study_name FROM time_studies WHERE id = ?`;
  const studyRows = await executeQuery<Record<string, unknown>>(studySql, [studyId]);
  const studyName = studyRows.length > 0 ? (studyRows[0].STUDY_NAME as string) : '';

  // Get step summary
  const sql = `
    SELECT
      st.id as step_id,
      st.step_name,
      st.sequence_order,
      COUNT(DISTINCT os.observation_id) as observations_with_step,
      COUNT(os.id) as total_visits,
      AVG(os.duration_seconds) as avg_duration_seconds,
      MEDIAN(os.duration_seconds) as median_duration_seconds,
      MIN(os.duration_seconds) as min_duration_seconds,
      MAX(os.duration_seconds) as max_duration_seconds,
      CASE WHEN COUNT(DISTINCT os.observation_id) > 0
           THEN COUNT(os.id)::FLOAT / COUNT(DISTINCT os.observation_id)
           ELSE NULL END as avg_visits_per_observation
    FROM time_study_steps st
    LEFT JOIN time_study_observation_steps os ON os.step_id = st.id
    WHERE st.study_id = ?
    GROUP BY st.id, st.step_name, st.sequence_order
    ORDER BY st.sequence_order
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  return rows.map((row) => ({
    study_id: studyId,
    study_name: studyName,
    step_id: row.STEP_ID as number,
    step_name: row.STEP_NAME as string,
    sequence_order: row.SEQUENCE_ORDER as number,
    observations_with_step: (row.OBSERVATIONS_WITH_STEP as number) || 0,
    total_visits: (row.TOTAL_VISITS as number) || 0,
    avg_duration_seconds: row.AVG_DURATION_SECONDS as number | null,
    median_duration_seconds: row.MEDIAN_DURATION_SECONDS as number | null,
    min_duration_seconds: row.MIN_DURATION_SECONDS as number | null,
    max_duration_seconds: row.MAX_DURATION_SECONDS as number | null,
    avg_visits_per_observation: row.AVG_VISITS_PER_OBSERVATION as number | null,
  }));
}

// Get flag summary with comparison to overall average
export async function getStudyFlagSummary(studyId: number): Promise<{
  flag_name: string;
  observation_count: number;
  percentage: number;
  avg_duration_seconds: number | null;
  duration_diff_vs_overall: number | null;
}[]> {
  // Get overall stats first
  const overallSql = `
    SELECT AVG(o.total_duration_seconds) as overall_avg, COUNT(o.id) as total_count
    FROM time_study_observations o
    JOIN time_study_sessions ss ON o.session_id = ss.id
    WHERE ss.study_id = ?
  `;
  const overallRows = await executeQuery<Record<string, unknown>>(overallSql, [studyId]);
  const overallAvg = overallRows[0]?.OVERALL_AVG as number | null;
  const totalCount = overallRows[0]?.TOTAL_COUNT as number || 0;

  // Get flag-level stats
  // Note: "of" is a reserved word in Snowflake, use "obs_flags" instead
  const sql = `
    SELECT
      f.flag_name,
      COUNT(DISTINCT obs_flags.observation_id) as observation_count,
      AVG(o.total_duration_seconds) as avg_duration_seconds
    FROM time_study_flags f
    LEFT JOIN time_study_observation_flags obs_flags ON f.id = obs_flags.flag_id
    LEFT JOIN time_study_observations o ON obs_flags.observation_id = o.id
    WHERE f.study_id = ?
    GROUP BY f.id, f.flag_name
    ORDER BY COUNT(DISTINCT obs_flags.observation_id) DESC
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  return rows.map((row) => {
    const avgDuration = row.AVG_DURATION_SECONDS as number | null;
    const obsCount = row.OBSERVATION_COUNT as number;
    return {
      flag_name: row.FLAG_NAME as string,
      observation_count: obsCount,
      percentage: totalCount > 0 ? (obsCount / totalCount) * 100 : 0,
      avg_duration_seconds: avgDuration,
      duration_diff_vs_overall: avgDuration && overallAvg ? avgDuration - overallAvg : null,
    };
  });
}

// Get opportunities grouped and counted
export async function getStudyOpportunities(studyId: number): Promise<{ opportunity: string; count: number }[]> {
  const sql = `
    SELECT o.opportunity, COUNT(*) as count
    FROM time_study_observations o
    JOIN time_study_sessions ss ON o.session_id = ss.id
    WHERE ss.study_id = ? AND o.opportunity IS NOT NULL AND o.opportunity != ''
    GROUP BY o.opportunity
    ORDER BY COUNT(*) DESC
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  return rows.map((row) => ({
    opportunity: row.OPPORTUNITY as string,
    count: row.COUNT as number,
  }));
}

// Get disposition breakdown
export async function getStudyDispositionBreakdown(studyId: number): Promise<{
  outcome_name: string;
  count: number;
  percentage: number;
}[]> {
  const sql = `
    SELECT
      COALESCE(oc.outcome_name, 'Uncoded') as outcome_name,
      COUNT(*) as count
    FROM time_study_observations o
    JOIN time_study_sessions ss ON o.session_id = ss.id
    LEFT JOIN time_study_outcomes oc ON o.outcome_id = oc.id
    WHERE ss.study_id = ?
    GROUP BY oc.outcome_name
    ORDER BY COUNT(*) DESC
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [studyId]);

  const total = rows.reduce((sum, row) => sum + (row.COUNT as number), 0);

  return rows.map((row) => {
    const count = row.COUNT as number;
    return {
      outcome_name: row.OUTCOME_NAME as string,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  });
}
