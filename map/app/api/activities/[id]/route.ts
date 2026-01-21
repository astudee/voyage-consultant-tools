import { NextRequest, NextResponse } from 'next/server';
import { getActivity, updateActivity, deleteActivity, ActivityInput } from '@/lib/snowflake';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) {
      return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
    }

    const activity = await getActivity(activityId);
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('API error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) {
      return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
    }

    const body = await request.json();

    if (!body.activity_name) {
      return NextResponse.json({ error: 'activity_name is required' }, { status: 400 });
    }

    if (!body.grid_location) {
      return NextResponse.json({ error: 'grid_location is required' }, { status: 400 });
    }

    const activityData: ActivityInput = {
      activity_name: body.activity_name,
      activity_type: body.activity_type || 'task',
      grid_location: body.grid_location,
      connections: body.connections,
      status: body.status,
      task_time_size: body.task_time_size,
      task_time_midpoint: body.task_time_midpoint,
      task_time_custom: body.task_time_custom,
      labor_rate_size: body.labor_rate_size,
      labor_rate_midpoint: body.labor_rate_midpoint,
      labor_rate_custom: body.labor_rate_custom,
      volume_size: body.volume_size,
      volume_midpoint: body.volume_midpoint,
      volume_custom: body.volume_custom,
      target_cycle_time_hours: body.target_cycle_time_hours,
      actual_cycle_time_hours: body.actual_cycle_time_hours,
      disposition_complete_pct: body.disposition_complete_pct,
      disposition_forwarded_pct: body.disposition_forwarded_pct,
      disposition_pended_pct: body.disposition_pended_pct,
      transformation_plan: body.transformation_plan,
      phase: body.phase,
      cost_to_change: body.cost_to_change,
      projected_annual_savings: body.projected_annual_savings,
      process_steps: body.process_steps,
      systems_touched: body.systems_touched,
      constraints_rules: body.constraints_rules,
      opportunities: body.opportunities,
      next_steps: body.next_steps,
      attachments: body.attachments,
      comments: body.comments,
      data_confidence: body.data_confidence,
      data_source: body.data_source,
    };

    await updateActivity(activityId, activityData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error updating activity:', error);
    return NextResponse.json(
      { error: 'Failed to update activity', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activityId = parseInt(id, 10);
    if (isNaN(activityId)) {
      return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
    }

    await deleteActivity(activityId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error deleting activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity', details: String(error) },
      { status: 500 }
    );
  }
}
