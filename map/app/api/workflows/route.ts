import { NextRequest, NextResponse } from 'next/server';
import { getWorkflows, createWorkflow } from '@/lib/snowflake';

export async function GET() {
  try {
    const workflows = await getWorkflows();
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('API error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Workflow name is required' }, { status: 400 });
    }

    const newId = await createWorkflow(name.trim(), description?.trim() || undefined);

    return NextResponse.json({ id: newId, success: true }, { status: 201 });
  } catch (error) {
    console.error('API error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow', details: String(error) },
      { status: 500 }
    );
  }
}
