import snowflake from 'snowflake-sdk';

// Configure snowflake to use environment variables
const connectionConfig = {
  account: process.env.SNOWFLAKE_ACCOUNT || '',
  username: process.env.SNOWFLAKE_USER || '',
  password: process.env.SNOWFLAKE_PASSWORD || '',
  warehouse: process.env.SNOWFLAKE_WAREHOUSE || '',
  database: process.env.SNOWFLAKE_DATABASE || '',
  schema: process.env.SNOWFLAKE_SCHEMA || '',
};

export interface Activity {
  id: number;
  workflow_id: number;
  activity_name: string;
  activity_type: 'task' | 'decision';
  grid_location: string;
  connections: string | null;
  status: string;
  task_time_midpoint: number | null;
  labor_rate_midpoint: number | null;
  volume_midpoint: number | null;
  transformation_plan: string | null;
  phase: number | null;
  comments: string | null;
}

export interface SwimlaneConfig {
  swimlane_letter: string;
  swimlane_name: string;
  workflow_id: number;
}

export interface Workflow {
  id: number;
  workflow_name: string;
  description: string;
}

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
          // Destroy connection after query
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

// Fetch all activities for a workflow
export async function getActivities(workflowId: number): Promise<Activity[]> {
  const sql = `
    SELECT
      id, workflow_id, activity_name, activity_type, grid_location,
      connections, status, task_time_midpoint, labor_rate_midpoint,
      volume_midpoint, transformation_plan, phase, comments
    FROM activities
    WHERE workflow_id = ?
    ORDER BY grid_location
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [workflowId]);

  return rows.map((row) => ({
    id: row.ID as number,
    workflow_id: row.WORKFLOW_ID as number,
    activity_name: row.ACTIVITY_NAME as string,
    activity_type: (row.ACTIVITY_TYPE as string) as 'task' | 'decision',
    grid_location: row.GRID_LOCATION as string,
    connections: row.CONNECTIONS as string | null,
    status: row.STATUS as string,
    task_time_midpoint: row.TASK_TIME_MIDPOINT as number | null,
    labor_rate_midpoint: row.LABOR_RATE_MIDPOINT as number | null,
    volume_midpoint: row.VOLUME_MIDPOINT as number | null,
    transformation_plan: row.TRANSFORMATION_PLAN as string | null,
    phase: row.PHASE as number | null,
    comments: row.COMMENTS as string | null,
  }));
}

// Fetch swimlane config for a workflow
export async function getSwimlaneConfig(workflowId: number): Promise<SwimlaneConfig[]> {
  const sql = `
    SELECT swimlane_letter, swimlane_name, workflow_id
    FROM swimlane_config
    WHERE workflow_id = ?
    ORDER BY swimlane_letter
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql, [workflowId]);

  return rows.map((row) => ({
    swimlane_letter: row.SWIMLANE_LETTER as string,
    swimlane_name: row.SWIMLANE_NAME as string,
    workflow_id: row.WORKFLOW_ID as number,
  }));
}

// Fetch all workflows
export async function getWorkflows(): Promise<Workflow[]> {
  const sql = `
    SELECT id, workflow_name, description
    FROM workflows
    ORDER BY workflow_name
  `;

  const rows = await executeQuery<Record<string, unknown>>(sql);

  return rows.map((row) => ({
    id: row.ID as number,
    workflow_name: row.WORKFLOW_NAME as string,
    description: row.DESCRIPTION as string,
  }));
}
