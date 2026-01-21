import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake';

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
    const { grid_location } = body;

    if (!grid_location || typeof grid_location !== 'string') {
      return NextResponse.json({ error: 'Grid location is required' }, { status: 400 });
    }

    // Validate grid location format (e.g., A1, B2, C10)
    const gridMatch = grid_location.match(/^([A-Z])(\d+)$/i);
    if (!gridMatch) {
      return NextResponse.json(
        { error: 'Invalid grid location format. Expected format: A1, B2, etc.' },
        { status: 400 }
      );
    }

    const normalizedLocation = grid_location.toUpperCase();

    // Update only the grid_location field
    await executeQuery(
      `UPDATE activities SET grid_location = ?, modified_at = CURRENT_TIMESTAMP(), modified_by = ? WHERE id = ?`,
      [normalizedLocation, 'app_user', activityId]
    );

    // Log audit
    await executeQuery(
      `INSERT INTO activity_audit_log (activity_id, action, changed_by, changes) VALUES (?, 'UPDATE_POSITION', ?, ?)`,
      [activityId, 'app_user', JSON.stringify({ grid_location: normalizedLocation })]
    );

    return NextResponse.json({ success: true, grid_location: normalizedLocation });
  } catch (error) {
    console.error('API error updating activity position:', error);
    return NextResponse.json(
      { error: 'Failed to update activity position', details: String(error) },
      { status: 500 }
    );
  }
}
