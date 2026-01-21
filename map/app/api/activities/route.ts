import { NextRequest, NextResponse } from 'next/server';
import { getActivities, getSwimlaneConfig, getWorkflows } from '@/lib/snowflake';

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
