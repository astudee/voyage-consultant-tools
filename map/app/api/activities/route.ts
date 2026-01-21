import { NextRequest, NextResponse } from 'next/server';
import {
  getActivities,
  getSwimlaneConfig,
  getWorkflows,
  createActivity,
  ActivityInput,
} from '@/lib/snowflake';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const workflowId = searchParams.get('workflowId');

  try {
    // If no workflowId, return list of workflows
    if (!workflowId) {
      const workflows = await getWorkflows();
      return NextResponse.json({ workflows });
    }

    const wfId = parseInt(workflowId, 10);
    if (isNaN(wfId)) {
      return NextResponse.json({ error: 'Invalid workflowId' }, { status: 400 });
    }

    // Fetch activities and swimlane config in parallel
    const [activities, swimlanes] = await Promise.all([
      getActivities(wfId),
      getSwimlaneConfig(wfId),
    ]);

    return NextResponse.json({
      activities,
      swimlanes,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, ...data } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    if (!data.activity_name) {
      return NextResponse.json({ error: 'activity_name is required' }, { status: 400 });
    }

    if (!data.grid_location) {
      return NextResponse.json({ error: 'grid_location is required' }, { status: 400 });
    }

    const activityData: ActivityInput = {
      activity_name: data.activity_name,
      activity_type: data.activity_type || 'task',
      grid_location: data.grid_location,
      connections: data.connections,
      status: data.status,
      task_time_size: data.task_time_size,
      task_time_midpoint: data.task_time_midpoint,
      task_time_custom: data.task_time_custom,
      labor_rate_size: data.labor_rate_size,
      labor_rate_midpoint: data.labor_rate_midpoint,
      labor_rate_custom: data.labor_rate_custom,
      volume_size: data.volume_size,
      volume_midpoint: data.volume_midpoint,
      volume_custom: data.volume_custom,
      target_cycle_time_hours: data.target_cycle_time_hours,
      actual_cycle_time_hours: data.actual_cycle_time_hours,
      disposition_complete_pct: data.disposition_complete_pct,
      disposition_forwarded_pct: data.disposition_forwarded_pct,
      disposition_pended_pct: data.disposition_pended_pct,
      transformation_plan: data.transformation_plan,
      phase: data.phase,
      cost_to_change: data.cost_to_change,
      projected_annual_savings: data.projected_annual_savings,
      process_steps: data.process_steps,
      systems_touched: data.systems_touched,
      constraints_rules: data.constraints_rules,
      opportunities: data.opportunities,
      next_steps: data.next_steps,
      attachments: data.attachments,
      comments: data.comments,
      data_confidence: data.data_confidence,
      data_source: data.data_source,
    };

    const newId = await createActivity(workflowId, activityData);

    return NextResponse.json({ id: newId, success: true }, { status: 201 });
  } catch (error) {
    console.error('API error creating activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity', details: String(error) },
      { status: 500 }
    );
  }
}
