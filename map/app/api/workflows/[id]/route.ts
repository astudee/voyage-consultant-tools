import { NextRequest, NextResponse } from 'next/server';
import { updateWorkflow, deleteWorkflow } from '@/lib/snowflake';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workflowId = parseInt(id, 10);

    if (isNaN(workflowId)) {
      return NextResponse.json({ error: 'Invalid workflow ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Workflow name is required' }, { status: 400 });
    }

    await updateWorkflow(workflowId, name.trim(), description?.trim() || undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow', details: String(error) },
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
    const workflowId = parseInt(id, 10);

    if (isNaN(workflowId)) {
      return NextResponse.json({ error: 'Invalid workflow ID' }, { status: 400 });
    }

    await deleteWorkflow(workflowId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow', details: String(error) },
      { status: 500 }
    );
  }
}
