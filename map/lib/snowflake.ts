import snowflake from 'snowflake-sdk';

// Re-export types for API routes to use
export type {
  Activity,
  ActivityInput,
  SwimlaneConfig,
  Workflow,
  TshirtConfig,
  ActivityCosts,
} from './types';
export { CONFIG, calculateActivityCosts } from './types';

import type { Activity, ActivityInput, SwimlaneConfig, Workflow, TshirtConfig } from './types';

// Configure snowflake to use environment variables
const connectionConfig = {
  account: process.env.SNOWFLAKE_ACCOUNT || '',
  username: process.env.SNOWFLAKE_USER || '',
  password: process.env.SNOWFLAKE_PASSWORD || '',
  warehouse: process.env.SNOWFLAKE_WAREHOUSE || '',
  database: process.env.SNOWFLAKE_DATABASE || '',
  schema: process.env.SNOWFLAKE_SCHEMA || '',
};

// Execute a query and return results as a promise
export async function executeQuery<T>(sql: string, binds: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection(connectionConfig);

    connection.connect((err) => {
      if (err) {
        console.error('Connection error:', err);
        reject(err);
        return;
      }

      connection.execute({
        sqlText: sql,
        binds: binds as snowflake.Binds,
        complete: (err, stmt, rows) => {
          connection.destroy((destroyErr) => {
            if (destroyErr) {
              console.error('Error destroying connection:', destroyErr);
            }
          });

          if (err) {
            console.error('Query error:', err);
            reject(err);
            return;
          }

          resolve((rows || []) as T[]);
        },
      });
    });
  });
}

// Map a database row to Activity type
function mapRowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.ID as number,
    workflow_id: row.WORKFLOW_ID as number,
    activity_name: row.ACTIVITY_NAME as string,
    activity_type: (row.ACTIVITY_TYPE as string) as 'task' | 'decision',
    grid_location: row.GRID_LOCATION as string,
    connections: row.CONNECTIONS as string | null,
    status: row.STATUS as string,
    task_time_size: row.TASK_TIME_SIZE as string | null,
    task_time_midpoint: row.TASK_TIME_MIDPOINT as number | null,
    task_time_custom: row.TASK_TIME_CUSTOM as number | null,
    labor_rate_size: row.LABOR_RATE_SIZE as string | null,
    labor_rate_midpoint: row.LABOR_RATE_MIDPOINT as number | null,
    labor_rate_custom: row.LABOR_RATE_CUSTOM as number | null,
    volume_size: row.VOLUME_SIZE as string | null,
    volume_midpoint: row.VOLUME_MIDPOINT as number | null,
    volume_custom: row.VOLUME_CUSTOM as number | null,
    target_cycle_time_hours: row.TARGET_CYCLE_TIME_HOURS as number | null,
    actual_cycle_time_hours: row.ACTUAL_CYCLE_TIME_HOURS as number | null,
    disposition_complete_pct: row.DISPOSITION_COMPLETE_PCT as number | null,
    disposition_forwarded_pct: row.DISPOSITION_FORWARDED_PCT as number | null,
    disposition_pended_pct: row.DISPOSITION_PENDED_PCT as number | null,
    transformation_plan: row.TRANSFORMATION_PLAN as string | null,
    phase: row.PHASE as number | null,
    cost_to_change: row.COST_TO_CHANGE as number | null,
    projected_annual_savings: row.PROJECTED_ANNUAL_SAVINGS as number | null,
    process_steps: row.PROCESS_STEPS as string | null,
    systems_touched: row.SYSTEMS_TOUCHED as string | null,
    constraints_rules: row.CONSTRAINTS_RULES as string | null,
    opportunities: row.OPPORTUNITIES as string | null,
    next_steps: row.NEXT_STEPS as string | null,
    attachments: row.ATTACHMENTS as string | null,
    comments: row.COMMENTS as string | null,
    data_confidence: row.DATA_CONFIDENCE as string | null,
    data_source: row.DATA_SOURCE as string | null,
    created_at: row.CREATED_AT as string | null,
    created_by: row.CREATED_BY as string | null,
    modified_at: row.MODIFIED_AT as string | null,
    modified_by: row.MODIFIED_BY as string | null,
  };
}

// Fetch all activities for a workflow
export async function getActivities(workflowId: number): Promise<Activity[]> {
  const sql = `
    SELECT *
    FROM activities
    WHERE workflow_id = ?
    ORDER BY grid_location
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [workflowId]);
  return rows.map(mapRowToActivity);
}

// Fetch a single activity by ID
export async function getActivity(activityId: number): Promise<Activity | null> {
  const sql = `SELECT * FROM activities WHERE id = ?`;
  const rows = await executeQuery<Record<string, unknown>>(sql, [activityId]);
  return rows.length > 0 ? mapRowToActivity(rows[0]) : null;
}

// Create a new activity
export async function createActivity(workflowId: number, data: ActivityInput): Promise<number> {
  // Get next sequential ID
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM activities'
  );
  const nextId = idResult[0].NEXT_ID as number;

  const sql = `
    INSERT INTO activities (
      id, workflow_id, activity_name, activity_type, grid_location, connections,
      task_time_size, task_time_midpoint, task_time_custom,
      labor_rate_size, labor_rate_midpoint, labor_rate_custom,
      volume_size, volume_midpoint, volume_custom,
      target_cycle_time_hours, actual_cycle_time_hours,
      disposition_complete_pct, disposition_forwarded_pct, disposition_pended_pct,
      transformation_plan, phase, status, cost_to_change, projected_annual_savings,
      process_steps, systems_touched, constraints_rules, opportunities, next_steps,
      attachments, comments, data_confidence, data_source, created_by
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `;

  await executeQuery(sql, [
    nextId,
    workflowId,
    data.activity_name,
    data.activity_type,
    data.grid_location?.toUpperCase() || null,
    data.connections || null,
    data.task_time_size || null,
    data.task_time_midpoint || null,
    data.task_time_custom || null,
    data.labor_rate_size || null,
    data.labor_rate_midpoint || null,
    data.labor_rate_custom || null,
    data.volume_size || null,
    data.volume_midpoint || null,
    data.volume_custom || null,
    data.target_cycle_time_hours || null,
    data.actual_cycle_time_hours || null,
    data.disposition_complete_pct || null,
    data.disposition_forwarded_pct || null,
    data.disposition_pended_pct || null,
    data.transformation_plan || null,
    data.phase || null,
    data.status || 'not_started',
    data.cost_to_change || null,
    data.projected_annual_savings || null,
    data.process_steps || null,
    data.systems_touched || null,
    data.constraints_rules || null,
    data.opportunities || null,
    data.next_steps || null,
    data.attachments || null,
    data.comments || null,
    data.data_confidence || null,
    data.data_source || null,
    'app_user',
  ]);

  // Log audit
  await executeQuery(
    `INSERT INTO activity_audit_log (activity_id, action, changed_by) VALUES (?, 'CREATE', ?)`,
    [nextId, 'app_user']
  );

  return nextId;
}

// Update an existing activity
export async function updateActivity(activityId: number, data: ActivityInput): Promise<void> {
  const sql = `
    UPDATE activities SET
      activity_name = ?,
      activity_type = ?,
      grid_location = ?,
      connections = ?,
      task_time_size = ?,
      task_time_midpoint = ?,
      task_time_custom = ?,
      labor_rate_size = ?,
      labor_rate_midpoint = ?,
      labor_rate_custom = ?,
      volume_size = ?,
      volume_midpoint = ?,
      volume_custom = ?,
      target_cycle_time_hours = ?,
      actual_cycle_time_hours = ?,
      disposition_complete_pct = ?,
      disposition_forwarded_pct = ?,
      disposition_pended_pct = ?,
      transformation_plan = ?,
      phase = ?,
      status = ?,
      cost_to_change = ?,
      projected_annual_savings = ?,
      process_steps = ?,
      systems_touched = ?,
      constraints_rules = ?,
      opportunities = ?,
      next_steps = ?,
      attachments = ?,
      comments = ?,
      data_confidence = ?,
      data_source = ?,
      modified_at = CURRENT_TIMESTAMP(),
      modified_by = ?
    WHERE id = ?
  `;

  await executeQuery(sql, [
    data.activity_name,
    data.activity_type,
    data.grid_location?.toUpperCase() || null,
    data.connections || null,
    data.task_time_size || null,
    data.task_time_midpoint || null,
    data.task_time_custom || null,
    data.labor_rate_size || null,
    data.labor_rate_midpoint || null,
    data.labor_rate_custom || null,
    data.volume_size || null,
    data.volume_midpoint || null,
    data.volume_custom || null,
    data.target_cycle_time_hours || null,
    data.actual_cycle_time_hours || null,
    data.disposition_complete_pct || null,
    data.disposition_forwarded_pct || null,
    data.disposition_pended_pct || null,
    data.transformation_plan || null,
    data.phase || null,
    data.status || 'not_started',
    data.cost_to_change || null,
    data.projected_annual_savings || null,
    data.process_steps || null,
    data.systems_touched || null,
    data.constraints_rules || null,
    data.opportunities || null,
    data.next_steps || null,
    data.attachments || null,
    data.comments || null,
    data.data_confidence || null,
    data.data_source || null,
    'app_user',
    activityId,
  ]);

  // Log audit
  await executeQuery(
    `INSERT INTO activity_audit_log (activity_id, action, changed_by) VALUES (?, 'UPDATE', ?)`,
    [activityId, 'app_user']
  );
}

// Delete an activity
export async function deleteActivity(activityId: number): Promise<void> {
  // Log audit first
  await executeQuery(
    `INSERT INTO activity_audit_log (activity_id, action, changed_by) VALUES (?, 'DELETE', ?)`,
    [activityId, 'app_user']
  );

  await executeQuery('DELETE FROM activities WHERE id = ?', [activityId]);
}

// Fetch swimlane config for a workflow
export async function getSwimlaneConfig(workflowId: number): Promise<SwimlaneConfig[]> {
  const sql = `
    SELECT id, swimlane_letter, swimlane_name, workflow_id, display_order
    FROM swimlane_config
    WHERE workflow_id = ?
    ORDER BY swimlane_letter
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [workflowId]);

  return rows.map((row) => ({
    id: row.ID as number,
    swimlane_letter: row.SWIMLANE_LETTER as string,
    swimlane_name: row.SWIMLANE_NAME as string,
    workflow_id: row.WORKFLOW_ID as number,
    display_order: row.DISPLAY_ORDER as number,
  }));
}

// Save swimlane config (upsert)
export async function saveSwimlaneConfig(
  workflowId: number,
  letter: string,
  name: string
): Promise<void> {
  // Check if exists
  const existing = await executeQuery<Record<string, unknown>>(
    'SELECT id FROM swimlane_config WHERE workflow_id = ? AND swimlane_letter = ?',
    [workflowId, letter]
  );

  if (existing.length > 0) {
    await executeQuery(
      `UPDATE swimlane_config SET swimlane_name = ?, modified_at = CURRENT_TIMESTAMP() WHERE workflow_id = ? AND swimlane_letter = ?`,
      [name, workflowId, letter]
    );
  } else {
    await executeQuery(
      `INSERT INTO swimlane_config (workflow_id, swimlane_letter, swimlane_name, display_order) VALUES (?, ?, ?, ?)`,
      [workflowId, letter, name, letter.charCodeAt(0) - 'A'.charCodeAt(0)]
    );
  }
}

// Fetch all workflows
export async function getWorkflows(): Promise<Workflow[]> {
  const sql = `
    SELECT id, workflow_name, description, created_at
    FROM workflows
    ORDER BY workflow_name
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql);

  return rows.map((row) => ({
    id: row.ID as number,
    workflow_name: row.WORKFLOW_NAME as string,
    description: row.DESCRIPTION as string,
    created_at: row.CREATED_AT as string,
  }));
}

// Create a new workflow
export async function createWorkflow(name: string, description?: string): Promise<number> {
  // Get next sequential ID
  const idResult = await executeQuery<Record<string, unknown>>(
    'SELECT COALESCE(MAX(id), 0) + 1 as NEXT_ID FROM workflows'
  );
  const nextId = idResult[0].NEXT_ID as number;

  await executeQuery(
    `INSERT INTO workflows (id, workflow_name, description, created_by) VALUES (?, ?, ?, ?)`,
    [nextId, name, description || null, 'app_user']
  );

  return nextId;
}

// Update an existing workflow
export async function updateWorkflow(workflowId: number, name: string, description?: string): Promise<void> {
  await executeQuery(
    `UPDATE workflows SET workflow_name = ?, description = ?, modified_at = CURRENT_TIMESTAMP() WHERE id = ?`,
    [name, description || null, workflowId]
  );
}

// Delete a workflow and all associated data
export async function deleteWorkflow(workflowId: number): Promise<void> {
  // Delete associated activities first (foreign key constraint)
  await executeQuery('DELETE FROM activities WHERE workflow_id = ?', [workflowId]);

  // Delete associated swimlane configs
  await executeQuery('DELETE FROM swimlane_config WHERE workflow_id = ?', [workflowId]);

  // Delete the workflow
  await executeQuery('DELETE FROM workflows WHERE id = ?', [workflowId]);
}

// Fetch t-shirt config
export async function getTshirtConfig(): Promise<Record<string, TshirtConfig[]>> {
  const sql = `
    SELECT category, size, label, min_value, max_value, midpoint, unit
    FROM tshirt_config
    WHERE engagement_id IS NULL
    ORDER BY category, min_value
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql);

  const config: Record<string, TshirtConfig[]> = {};
  for (const row of rows) {
    const category = row.CATEGORY as string;
    if (!config[category]) {
      config[category] = [];
    }
    config[category].push({
      category,
      size: row.SIZE as string,
      label: row.LABEL as string,
      min_value: row.MIN_VALUE as number,
      max_value: row.MAX_VALUE as number,
      midpoint: row.MIDPOINT as number,
      unit: row.UNIT as string,
    });
  }

  return config;
}
