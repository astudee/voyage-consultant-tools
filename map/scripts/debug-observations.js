// Debug script to check observations data in Snowflake
// Run with: node scripts/debug-observations.js

const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

const snowflake = require('snowflake-sdk');

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USER,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
});

function query(sql) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      },
    });
  });
}

async function main() {
  console.log('Connecting to Snowflake...');

  await new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });

  console.log('Connected!\n');

  // Query 1: Check observations with their study_activity_id
  console.log('=== OBSERVATIONS (last 10) ===');
  const observations = await query(`
    SELECT
      o.id,
      o.session_id,
      o.study_activity_id,
      o.adhoc_activity_name,
      o.outcome_id,
      o.total_duration_seconds,
      ss.study_id
    FROM TIME_STUDY_OBSERVATIONS o
    JOIN TIME_STUDY_SESSIONS ss ON o.session_id = ss.id
    ORDER BY o.created_at DESC
    LIMIT 10
  `);
  console.table(observations);

  // Query 2: Check if study_activity_id is NULL vs set
  console.log('\n=== STUDY_ACTIVITY_ID DISTRIBUTION ===');
  const activityDistrib = await query(`
    SELECT
      CASE WHEN o.study_activity_id IS NULL THEN 'NULL' ELSE 'SET' END as activity_status,
      COUNT(*) as count
    FROM TIME_STUDY_OBSERVATIONS o
    GROUP BY CASE WHEN o.study_activity_id IS NULL THEN 'NULL' ELSE 'SET' END
  `);
  console.table(activityDistrib);

  // Query 3: Check study activities available
  console.log('\n=== STUDY ACTIVITIES ===');
  const activities = await query(`
    SELECT id, study_id, activity_name, is_active
    FROM TIME_STUDY_ACTIVITIES
    ORDER BY study_id, id
  `);
  console.table(activities);

  // Query 4: Run the summary query directly
  console.log('\n=== SUMMARY QUERY (for each study) ===');
  const summaries = await query(`
    SELECT
      ss.study_id,
      COUNT(DISTINCT ss.id) as session_count,
      COUNT(o.id) as observation_count,
      AVG(o.total_duration_seconds) as avg_duration
    FROM time_study_sessions ss
    LEFT JOIN time_study_observations o ON o.session_id = ss.id
    GROUP BY ss.study_id
  `);
  console.table(summaries);

  // Query 5: Run the activity summary query directly
  console.log('\n=== ACTIVITY SUMMARY QUERY ===');
  const activitySummary = await query(`
    SELECT
      ss.study_id,
      COALESCE(a.activity_name, o.adhoc_activity_name, 'Unspecified') as activity_name,
      o.study_activity_id,
      COUNT(o.id) as observation_count
    FROM time_study_observations o
    JOIN time_study_sessions ss ON o.session_id = ss.id
    LEFT JOIN time_study_activities a ON o.study_activity_id = a.id
    GROUP BY ss.study_id, COALESCE(a.activity_name, o.adhoc_activity_name, 'Unspecified'), o.study_activity_id
    ORDER BY ss.study_id
  `);
  console.table(activitySummary);

  connection.destroy();
  console.log('\nDone!');
}

main().catch(console.error);
