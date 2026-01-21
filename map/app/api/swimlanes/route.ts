import { NextRequest, NextResponse } from 'next/server';
import { getSwimlaneConfig, saveSwimlaneConfig } from '@/lib/snowflake';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
  }

  const wfId = parseInt(workflowId, 10);
  if (isNaN(wfId)) {
    return NextResponse.json({ error: 'Invalid workflowId' }, { status: 400 });
  }

  try {
    const swimlanes = await getSwimlaneConfig(wfId);
    return NextResponse.json({ swimlanes });
  } catch (error) {
    console.error('API error fetching swimlanes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch swimlanes', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, letter, name } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    if (!letter) {
      return NextResponse.json({ error: 'letter is required' }, { status: 400 });
    }

    await saveSwimlaneConfig(workflowId, letter.toUpperCase(), name || '');

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('API error saving swimlane:', error);
    return NextResponse.json(
      { error: 'Failed to save swimlane', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, letter, name } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    if (!letter) {
      return NextResponse.json({ error: 'letter is required' }, { status: 400 });
    }

    await saveSwimlaneConfig(workflowId, letter.toUpperCase(), name || '');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error updating swimlane:', error);
    return NextResponse.json(
      { error: 'Failed to update swimlane', details: String(error) },
      { status: 500 }
    );
  }
}
