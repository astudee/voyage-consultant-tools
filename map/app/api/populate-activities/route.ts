import { NextResponse } from 'next/server';
import { executeQuery, getActivities } from '@/lib/snowflake';

// Process steps templates based on activity type and name patterns
const processStepsTemplates: Record<string, string[]> = {
  // Mail Room activities
  'open the mail': [
    '1. Retrieve mail batch from mailroom sorting area',
    '2. Verify batch count matches manifest',
    '3. Open envelopes using letter opener, preserving contents',
    '4. Remove and unfold all documents',
    '5. Stack documents for scanning queue'
  ],
  'scan the mail': [
    '1. Place documents in scanner feeder tray',
    '2. Select appropriate scan profile (color/BW, resolution)',
    '3. Initiate batch scan and verify page count',
    '4. Review scanned images for quality and completeness',
    '5. Index scanned batch with date and batch ID'
  ],
  // Indexing activities
  'index the scans': [
    '1. Open scanned document in indexing system',
    '2. Identify document type and policy number',
    '3. Extract key data fields (name, date, amount)',
    '4. Validate data against policy system',
    '5. Route document to appropriate work queue'
  ],
  'assign the work': [
    '1. Review incoming work item details',
    '2. Determine work type and complexity',
    '3. Check team capacity and skill requirements',
    '4. Assign to appropriate specialist queue',
    '5. Set priority and SLA deadline'
  ],
  // Intake Reviews
  'intake review': [
    '1. Open case file and review submission documents',
    '2. Verify completeness of required information',
    '3. Check for any red flags or missing data',
    '4. Document initial findings in case notes',
    '5. Route to next processing step or request additional info'
  ],
  // Risk Assessment
  'risk assessment': [
    '1. Review all collected data and documentation',
    '2. Apply risk scoring criteria and guidelines',
    '3. Calculate preliminary risk score',
    '4. Identify any factors requiring escalation',
    '5. Document risk assessment findings and recommendation'
  ],
  // Determination (decision)
  'determination': [
    '1. Review all case information and assessments',
    '2. Apply underwriting guidelines and criteria',
    '3. Make approval/decline/escalation decision',
    '4. Document decision rationale',
    '5. Route to appropriate next step based on outcome'
  ],
  // Letter Drafting
  'draft': [
    '1. Select appropriate letter template',
    '2. Populate template with case-specific details',
    '3. Review letter for accuracy and completeness',
    '4. Apply required disclosures and legal language',
    '5. Queue letter for quality review'
  ],
  'letter': [
    '1. Select appropriate letter template',
    '2. Populate template with case-specific details',
    '3. Review letter for accuracy and completeness',
    '4. Apply required disclosures and legal language',
    '5. Queue letter for quality review'
  ],
  // Property/Appraisal
  'property appraisal': [
    '1. Submit appraisal request to vendor portal',
    '2. Verify property address and access details',
    '3. Track appraisal scheduling and completion',
    '4. Receive and upload appraisal report',
    '5. Flag any valuation concerns for review'
  ],
  'photos': [
    '1. Download submitted photos from portal',
    '2. Verify photo quality and completeness',
    '3. Compare photos against property description',
    '4. Document any discrepancies or concerns',
    '5. Attach verified photos to case file'
  ],
  // Marine/Boat
  'benchmarking': [
    '1. Research comparable vessel sales and values',
    '2. Query marine valuation databases',
    '3. Adjust for vessel condition and features',
    '4. Document valuation methodology',
    '5. Prepare benchmarking summary report'
  ],
  'condition assessment': [
    '1. Review vessel survey report',
    '2. Evaluate maintenance history and records',
    '3. Assess hull, engine, and safety equipment',
    '4. Identify any required repairs or upgrades',
    '5. Summarize condition findings in case notes'
  ],
  // MVR
  'mvr': [
    '1. Submit MVR request to state DMV system',
    '2. Verify driver license number and state',
    '3. Receive and review MVR report',
    '4. Flag any violations or suspensions',
    '5. Document driving history summary'
  ],
  // Escalation
  'escalated intake': [
    '1. Review escalation reason and history',
    '2. Gather all supporting documentation',
    '3. Verify previous handling attempts',
    '4. Prepare escalation summary brief',
    '5. Route to senior review queue'
  ],
  'customer outreach': [
    '1. Review customer contact history',
    '2. Prepare talking points and case summary',
    '3. Attempt customer contact via preferred method',
    '4. Document conversation and outcomes',
    '5. Schedule follow-up if needed'
  ],
  'compliance review': [
    '1. Review case against compliance checklist',
    '2. Verify regulatory requirements are met',
    '3. Check for required disclosures and notices',
    '4. Document any compliance gaps',
    '5. Provide compliance clearance or remediation steps'
  ],
  'underwriter review': [
    '1. Review complete case file and history',
    '2. Analyze risk factors and mitigations',
    '3. Consult guidelines for complex scenarios',
    '4. Make final underwriting decision',
    '5. Document decision with detailed rationale'
  ],
  // Quality/Print
  'quality review': [
    '1. Open letter in quality review queue',
    '2. Verify all required fields are populated',
    '3. Check grammar, spelling, and formatting',
    '4. Confirm correct enclosures are attached',
    '5. Approve for print or return for corrections'
  ],
  'print': [
    '1. Retrieve approved letters from print queue',
    '2. Verify printer settings and paper stock',
    '3. Execute print job with quality check',
    '4. Collate printed materials with enclosures',
    '5. Prepare for mail assembly'
  ],
  'assemble': [
    '1. Match letter with correct envelope type',
    '2. Insert letter and required enclosures',
    '3. Verify complete assembly before sealing',
    '4. Apply postage or meter stamp',
    '5. Sort into outbound mail bins'
  ],
  'mail preparation': [
    '1. Sort assembled mail by delivery class',
    '2. Bundle mail per postal requirements',
    '3. Complete postal manifest documentation',
    '4. Weigh and verify postage amounts',
    '5. Stage for carrier pickup'
  ],
  'dispatch': [
    '1. Verify all mail batches are complete',
    '2. Record batch counts and tracking info',
    '3. Hand off to postal carrier or courier',
    '4. Obtain pickup confirmation receipt',
    '5. Update system with dispatch timestamp'
  ]
};

// Generate process steps based on activity name
function generateProcessSteps(activityName: string, activityType: string): string {
  const nameLower = activityName.toLowerCase();

  // Try to find a matching template
  for (const [key, steps] of Object.entries(processStepsTemplates)) {
    if (nameLower.includes(key)) {
      return steps.join('\n');
    }
  }

  // Default steps based on activity type
  if (activityType === 'decision') {
    return [
      '1. Review incoming case data and documentation',
      '2. Apply decision criteria and business rules',
      '3. Evaluate all relevant factors',
      '4. Make and document decision',
      '5. Route to appropriate next step'
    ].join('\n');
  }

  // Generic task steps
  return [
    '1. Receive and open work item',
    '2. Review required information and documentation',
    '3. Process according to standard procedures',
    '4. Document actions and findings',
    '5. Complete and route to next step'
  ].join('\n');
}

// Transformation plans to distribute
const transformationPlans = ['eliminate', 'automate', 'outsource', 'optimize', 'defer'];

export async function POST() {
  try {
    // Get all activities from workflow 1
    const activities = await getActivities(1);

    const updates: { id: number; name: string; processSteps: boolean; transformation: boolean; plan?: string | null }[] = [];
    let planIndex = 0;

    for (const activity of activities) {
      const needsProcessSteps = !activity.process_steps || activity.process_steps.trim() === '';
      const needsTransformation = !activity.transformation_plan || activity.transformation_plan.trim() === '';

      if (!needsProcessSteps && !needsTransformation) {
        continue;
      }

      const processSteps = needsProcessSteps
        ? generateProcessSteps(activity.activity_name, activity.activity_type)
        : activity.process_steps;

      // Assign transformation plan in round-robin for even distribution
      const transformationPlan = needsTransformation
        ? transformationPlans[planIndex++ % transformationPlans.length]
        : activity.transformation_plan;

      // Update the activity
      const sql = `
        UPDATE activities SET
          process_steps = ?,
          transformation_plan = ?,
          modified_at = CURRENT_TIMESTAMP(),
          modified_by = ?
        WHERE id = ?
      `;

      await executeQuery(sql, [
        processSteps,
        transformationPlan,
        'bulk_update',
        activity.id
      ]);

      updates.push({
        id: activity.id,
        name: activity.activity_name,
        processSteps: needsProcessSteps,
        transformation: needsTransformation,
        plan: needsTransformation ? transformationPlan : undefined
      });
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} activities`,
      updates
    });
  } catch (error) {
    console.error('Error populating activities:', error);
    return NextResponse.json(
      { error: 'Failed to populate activities', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to populate activities with process steps and transformation plans'
  });
}
