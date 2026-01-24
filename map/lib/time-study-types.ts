// Time Study types - shared between client and server

export type StructureType = 'simple' | 'phases' | 'segments';
export type StudyStatus = 'active' | 'completed' | 'archived';
export type SessionStatus = 'in_progress' | 'completed';

// Template types
export interface TimeStudyTemplate {
  id: number;
  template_name: string;
  description: string | null;
  structure_type: StructureType;
  is_system_template: boolean;
  created_at: string | null;
  created_by: string | null;
  steps?: TimeStudyTemplateStep[];
}

export interface TimeStudyTemplateStep {
  id: number;
  template_id: number;
  step_name: string;
  sequence_order: number;
  is_required: boolean;
  created_at: string | null;
}

// Study types
export interface TimeStudy {
  id: number;
  study_name: string;
  workflow_id: number | null;
  workflow_name?: string | null;
  template_id: number | null;
  template_name?: string | null;
  structure_type: StructureType;
  status: StudyStatus;
  created_at: string | null;
  created_by: string | null;
  modified_at: string | null;
  modified_by: string | null;
  // Summary stats (from view or calculated)
  session_count?: number;
  observation_count?: number;
}

export interface TimeStudyInput {
  study_name: string;
  workflow_id?: number | null;
  template_id?: number | null;
  structure_type: StructureType;
  status?: StudyStatus;
}

export interface TimeStudyStep {
  id: number;
  study_id: number;
  step_name: string;
  sequence_order: number;
  is_required: boolean;
  created_at: string | null;
}

export interface TimeStudyStepInput {
  step_name: string;
  sequence_order: number;
  is_required?: boolean;
}

export interface TimeStudyActivity {
  id: number;
  study_id: number;
  workflow_activity_id: number | null;
  activity_name: string;
  is_adhoc: boolean;
  is_active: boolean;
  created_at: string | null;
}

export interface TimeStudyActivityInput {
  workflow_activity_id?: number | null;
  activity_name: string;
  is_adhoc?: boolean;
  is_active?: boolean;
}

export interface TimeStudyFlag {
  id: number;
  study_id: number;
  flag_name: string;
  is_standard: boolean;
  created_at: string | null;
}

export interface TimeStudyFlagInput {
  flag_name: string;
  is_standard?: boolean;
}

export interface TimeStudyOutcome {
  id: number;
  study_id: number;
  outcome_name: string;
  created_at: string | null;
}

export interface TimeStudyOutcomeInput {
  outcome_name: string;
}

// Session types
export interface TimeStudySession {
  id: number;
  study_id: number;
  study_name?: string;
  observer_name: string;
  observed_worker_name: string | null;
  session_date: string;
  started_at: string;
  ended_at: string | null;
  status: SessionStatus;
  notes: string | null;
  created_at: string | null;
  observation_count?: number;
  total_duration_seconds?: number | null;
}

export interface TimeStudySessionInput {
  observer_name: string;
  observed_worker_name?: string | null;
  session_date: string;
  started_at: string;
  notes?: string | null;
}

// Observation types
export interface TimeStudyObservation {
  id: number;
  session_id: number;
  study_activity_id: number | null;
  activity_name?: string | null;
  adhoc_activity_name: string | null;
  observation_number: number;
  started_at: string;
  ended_at: string | null;
  total_duration_seconds: number | null;
  call_duration_seconds: number | null;  // For Contact Center: talk time
  acw_duration_seconds: number | null;   // For Contact Center: after call work
  outcome_id: number | null;
  outcome_name?: string | null;
  notes: string | null;
  opportunity: string | null;
  created_at: string | null;
  flags?: TimeStudyFlag[];
  steps?: TimeStudyObservationStep[];
}

export interface TimeStudyObservationInput {
  study_activity_id?: number | null;
  adhoc_activity_name?: string | null;
  observation_number: number;
  started_at: string;
  ended_at?: string | null;
  total_duration_seconds?: number | null;
  call_duration_seconds?: number | null;  // For Contact Center: talk time
  acw_duration_seconds?: number | null;   // For Contact Center: after call work
  outcome_id?: number | null;
  notes?: string | null;
  opportunity?: string | null;
  flag_ids?: number[];
}

export interface TimeStudyObservationStep {
  id: number;
  observation_id: number;
  step_id: number;
  step_name?: string;
  visit_number: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  sequence_in_observation: number;
  created_at: string | null;
}

export interface TimeStudyObservationStepInput {
  step_id: number;
  visit_number?: number;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  sequence_in_observation: number;
}

// Summary/Stats types
export interface TimeStudySummary {
  study_id: number;
  study_name: string;
  workflow_id: number | null;
  workflow_name: string | null;
  study_status: StudyStatus;
  session_count: number;
  observer_count: number;
  observation_count: number;
  avg_duration_seconds: number | null;
  median_duration_seconds: number | null;
  min_duration_seconds: number | null;
  max_duration_seconds: number | null;
  stddev_duration_seconds: number | null;
  first_session_date: string | null;
  last_session_date: string | null;
}

export interface TimeStudyActivitySummary {
  study_id: number;
  study_name: string;
  activity_name: string;
  is_adhoc: boolean;
  observation_count: number;
  avg_duration_seconds: number | null;
  median_duration_seconds: number | null;
  min_duration_seconds: number | null;
  max_duration_seconds: number | null;
  stddev_duration_seconds: number | null;
  complete_count: number;
  transferred_count: number;
  pended_count: number;
}

export interface TimeStudyStepSummary {
  study_id: number;
  study_name: string;
  step_id: number;
  step_name: string;
  sequence_order: number;
  observations_with_step: number;
  total_visits: number;
  avg_duration_seconds: number | null;
  median_duration_seconds: number | null;
  min_duration_seconds: number | null;
  max_duration_seconds: number | null;
  avg_visits_per_observation: number | null;
}

export interface TimeStudyFlagSummary {
  flag_id: number;
  flag_name: string;
  observation_count: number;
  percentage: number;
  avg_duration_seconds: number | null;
  duration_diff_vs_overall: number | null;
}

export interface TimeStudyOpportunitySummary {
  opportunity: string;
  count: number;
}

// Helper to format duration
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--';

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Helper to format duration with tenths
export function formatDurationPrecise(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}
