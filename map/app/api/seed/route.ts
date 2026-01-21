import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake';

const WORKFLOW_ID = 1;

// Swimlane to add
const NEW_SWIMLANE = {
  letter: 'G',
  name: 'Outbound Correspondence',
  display_order: 6
};

// T-shirt size midpoints
const TASK_TIME_MIDPOINTS: Record<string, number> = {
  XS: 1, S: 3, M: 7.5, L: 22.5, XL: 45, XXL: 90
};
const LABOR_RATE_MIDPOINTS: Record<string, number> = {
  L: 25, M: 40, H: 60, XH: 85
};
const VOLUME_MIDPOINTS: Record<string, number> = {
  XS: 25, S: 75, M: 300, L: 750, XL: 2000, XXL: 7500
};

// Activities to insert
// Format: [grid_location, name, type, task_time_size, labor_rate_size, volume_size, connections]
const ACTIVITIES: Array<[string, string, string, string, string, string, Array<{condition?: string; next?: string}> | null]> = [
  // Swimlane C - Auto
  ['C4', 'Auto Intake Review', 'task', 'M', 'M', 'L', [{next: 'C5'}]],
  ['C5', 'Pull MVR Report', 'task', 'S', 'M', 'L', [{next: 'C6'}]],
  ['C6', 'Auto Risk Assessment', 'task', 'L', 'H', 'L', [{next: 'C7'}]],
  ['C7', 'Auto Determination', 'decision', 'M', 'H', 'L', [{condition: 'Approve', next: 'C8'}, {condition: 'Decline', next: 'C8'}, {condition: 'Escalate', next: 'F4'}]],
  ['C8', 'Draft Auto Letter', 'task', 'M', 'M', 'L', [{next: 'G10'}]],

  // Swimlane D - Home
  ['D4', 'Home Intake Review', 'task', 'M', 'M', 'L', [{next: 'D5'}]],
  ['D5', 'Request Property Appraisal', 'task', 'S', 'M', 'L', [{next: 'D6'}]],
  ['D6', 'Review Photos & Documentation', 'task', 'L', 'M', 'L', [{next: 'D7'}]],
  ['D7', 'Home Risk Assessment', 'task', 'XL', 'H', 'L', [{next: 'D8'}]],
  ['D8', 'Home Determination', 'decision', 'M', 'H', 'L', [{condition: 'Approve', next: 'D9'}, {condition: 'Decline', next: 'D9'}, {condition: 'Escalate', next: 'F4'}]],
  ['D9', 'Draft Home Letter', 'task', 'M', 'M', 'L', [{next: 'G10'}]],

  // Swimlane E - Boat
  ['E4', 'Boat Intake Review', 'task', 'M', 'M', 'M', [{next: 'E5'}]],
  ['E5', 'Marine Benchmarking', 'task', 'L', 'H', 'M', [{next: 'E6'}]],
  ['E6', 'Boat Condition Assessment', 'task', 'L', 'H', 'M', [{next: 'E7'}]],
  ['E7', 'Boat Determination', 'decision', 'M', 'H', 'M', [{condition: 'Approve', next: 'E8'}, {condition: 'Decline', next: 'E8'}, {condition: 'Escalate', next: 'F4'}]],
  ['E8', 'Draft Boat Letter', 'task', 'M', 'M', 'M', [{next: 'G10'}]],

  // Swimlane F - Escalation
  ['F4', 'Escalated Intake Review', 'task', 'L', 'H', 'S', [{next: 'F5'}]],
  ['F5', 'Proactive Customer Outreach', 'task', 'L', 'H', 'S', [{next: 'F6'}]],
  ['F6', 'Legal/Compliance Review', 'task', 'XL', 'XH', 'S', [{next: 'F7'}]],
  ['F7', 'Senior Underwriter Review', 'task', 'XL', 'XH', 'S', [{next: 'F8'}]],
  ['F8', 'Escalated Determination', 'decision', 'L', 'XH', 'S', [{condition: 'Approve', next: 'F9'}, {condition: 'Decline', next: 'F9'}]],
  ['F9', 'Draft Escalated Letter', 'task', 'L', 'H', 'S', [{next: 'G10'}]],

  // Swimlane G - Outbound Correspondence
  ['G10', 'Letter Quality Review', 'task', 'S', 'M', 'XL', [{next: 'G11'}]],
  ['G11', 'Print & Assemble', 'task', 'S', 'L', 'XL', [{next: 'G12'}]],
  ['G12', 'Mail Preparation', 'task', 'S', 'L', 'XL', [{next: 'G13'}]],
  ['G13', 'Outbound Mail Dispatch', 'task', 'S', 'L', 'XL', null],
];

export async function POST(request: NextRequest) {
  try {
    const results: string[] = [];

    // 1. Insert swimlane G if not exists
    const existingSwimlane = await executeQuery<Record<string, unknown>>(
      'SELECT id FROM swimlane_config WHERE workflow_id = ? AND swimlane_letter = ?',
      [WORKFLOW_ID, NEW_SWIMLANE.letter]
    );

    if (existingSwimlane.length === 0) {
      await executeQuery(
        'INSERT INTO swimlane_config (workflow_id, swimlane_letter, swimlane_name, display_order) VALUES (?, ?, ?, ?)',
        [WORKFLOW_ID, NEW_SWIMLANE.letter, NEW_SWIMLANE.name, NEW_SWIMLANE.display_order]
      );
      results.push(`Inserted swimlane ${NEW_SWIMLANE.letter}: ${NEW_SWIMLANE.name}`);
    } else {
      results.push(`Swimlane ${NEW_SWIMLANE.letter} already exists`);
    }

    // 2. Get max activity ID
    const maxIdResult = await executeQuery<Record<string, unknown>>(
      'SELECT COALESCE(MAX(id), 0) as MAX_ID FROM activities'
    );
    let nextId = (maxIdResult[0].MAX_ID as number) + 1;

    // 3. Insert activities
    let inserted = 0;
    let skipped = 0;

    for (const act of ACTIVITIES) {
      const [gridLoc, name, actType, taskTime, laborRate, volume, connections] = act;

      // Check if activity already exists
      const existing = await executeQuery<Record<string, unknown>>(
        'SELECT id FROM activities WHERE workflow_id = ? AND grid_location = ?',
        [WORKFLOW_ID, gridLoc]
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const taskTimeMid = TASK_TIME_MIDPOINTS[taskTime] || null;
      const laborRateMid = LABOR_RATE_MIDPOINTS[laborRate] || null;
      const volumeMid = VOLUME_MIDPOINTS[volume] || null;
      const connectionsJson = connections ? JSON.stringify(connections) : null;

      await executeQuery(
        `INSERT INTO activities (
          id, workflow_id, activity_name, activity_type, grid_location, connections,
          task_time_size, task_time_midpoint,
          labor_rate_size, labor_rate_midpoint,
          volume_size, volume_midpoint,
          status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nextId, WORKFLOW_ID, name, actType, gridLoc, connectionsJson,
          taskTime, taskTimeMid,
          laborRate, laborRateMid,
          volume, volumeMid,
          'not_started', 'seed_api'
        ]
      );

      nextId++;
      inserted++;
    }

    results.push(`Inserted ${inserted} activities, skipped ${skipped} (already exist)`);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed data', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to seed swimlane G and activities',
    swimlane: NEW_SWIMLANE,
    activityCount: ACTIVITIES.length
  });
}
