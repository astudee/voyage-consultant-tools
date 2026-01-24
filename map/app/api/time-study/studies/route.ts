import { NextRequest, NextResponse } from 'next/server';
import {
  getStudies,
  createStudy,
  copyTemplateStepsToStudy,
  createDefaultOutcomes,
  createDefaultFlags,
} from '@/lib/snowflake-time-study';

export async function GET() {
  try {
    const studies = await getStudies();
    return NextResponse.json({ studies });
  } catch (error) {
    console.error('API error fetching studies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch studies', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { study_name, workflow_id, template_id, structure_type } = body;

    if (!study_name || !study_name.trim()) {
      return NextResponse.json({ error: 'Study name is required' }, { status: 400 });
    }

    if (!structure_type) {
      return NextResponse.json({ error: 'Structure type is required' }, { status: 400 });
    }

    const studyId = await createStudy({
      study_name: study_name.trim(),
      workflow_id: workflow_id || null,
      template_id: template_id || null,
      structure_type,
    });

    // If template_id provided, copy steps from template
    if (template_id) {
      await copyTemplateStepsToStudy(studyId, template_id);
    }

    // Create default outcomes and flags
    await createDefaultOutcomes(studyId);
    await createDefaultFlags(studyId);

    return NextResponse.json({ id: studyId, success: true }, { status: 201 });
  } catch (error) {
    console.error('API error creating study:', error);
    return NextResponse.json(
      { error: 'Failed to create study', details: String(error) },
      { status: 500 }
    );
  }
}
