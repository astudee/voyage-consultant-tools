import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake';

export async function POST() {
  try {
    const results: string[] = [];

    // Fix activity 5: Auto Intake Review -> C4
    await executeQuery(
      `UPDATE activities SET grid_location = 'C4', connections = ? WHERE id = 5`,
      [JSON.stringify([{next: 'C5'}])]
    );
    results.push('Updated id 5 (Auto Intake Review): B2 -> C4');

    // Fix activity 6: Pull MVR Report -> C5
    await executeQuery(
      `UPDATE activities SET grid_location = 'C5', connections = ? WHERE id = 6`,
      [JSON.stringify([{next: 'C6'}])]
    );
    results.push('Updated id 6 (Pull MVR Report): B4 -> C5');

    // Fix activity 7: Auto Risk Assessment -> C6
    await executeQuery(
      `UPDATE activities SET grid_location = 'C6', connections = ? WHERE id = 7`,
      [JSON.stringify([{next: 'C7'}])]
    );
    results.push('Updated id 7 (Auto Risk Assessment): A4 -> C6');

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Fix error:', error);
    return NextResponse.json(
      { error: 'Failed to fix activities', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to fix misplaced activities (5, 6, 7) to correct C4, C5, C6 positions'
  });
}
