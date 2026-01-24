import type { WizardState } from '../page';
import type { TimeStudyTemplate } from '@/lib/snowflake-time-study';
import type { Workflow } from '@/lib/types';

interface Step5ReviewProps {
  state: WizardState;
  templates: TimeStudyTemplate[];
  workflows: Workflow[];
}

export default function Step5Review({ state, templates, workflows }: Step5ReviewProps) {
  const selectedTemplate = templates.find((t) => t.id === state.templateId);
  const selectedWorkflow = workflows.find((w) => w.id === state.workflowId);
  const selectedActivities = state.activities.filter((a) => a.selected);
  const selectedFlags = state.flags.filter((f) => f.selected);
  const selectedOutcomes = state.outcomes.filter((o) => o.selected);

  const structureTypeLabel = {
    simple: 'Simple Timer',
    phases: 'Phases (Sequential)',
    segments: 'Segments (Flexible)',
  }[state.structureType];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Review Your Study</h3>
        <p className="text-sm text-gray-500 mt-1">
          Review your configuration before creating the study
        </p>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        {/* Basics */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              1
            </span>
            Basics
          </h4>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Study Name</dt>
              <dd className="font-medium text-gray-900">{state.studyName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Workflow</dt>
              <dd className="font-medium text-gray-900">
                {selectedWorkflow?.workflow_name || 'None (ad-hoc only)'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Template</dt>
              <dd className="font-medium text-gray-900">
                {selectedTemplate?.template_name || 'None'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Time Structure</dt>
              <dd className="font-medium text-gray-900">{structureTypeLabel}</dd>
            </div>
          </dl>
        </div>

        {/* Activities */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              2
            </span>
            Activities
            <span className="text-xs font-normal text-gray-500">
              ({selectedActivities.length} selected)
            </span>
          </h4>
          {selectedActivities.length === 0 ? (
            <p className="text-sm text-gray-500">No activities selected</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedActivities.map((activity, index) => (
                <span
                  key={index}
                  className={`
                    text-sm px-3 py-1 rounded-full
                    ${activity.is_adhoc ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}
                  `}
                >
                  {activity.activity_name}
                  {activity.is_adhoc && (
                    <span className="text-xs ml-1">(ad-hoc)</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Time Structure / Steps */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              3
            </span>
            Time Structure
          </h4>
          {state.structureType === 'simple' ? (
            <p className="text-sm text-gray-600">
              Simple start/stop timer - no steps configured
            </p>
          ) : state.steps.length === 0 ? (
            <p className="text-sm text-gray-500">No steps configured</p>
          ) : (
            <div className="flex items-center flex-wrap gap-2">
              {state.steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <span
                    className={`
                      text-sm px-3 py-1 rounded
                      ${state.structureType === 'phases' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}
                    `}
                  >
                    {step.step_name}
                  </span>
                  {state.structureType === 'phases' && index < state.steps.length - 1 && (
                    <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Flags & Outcomes */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              4
            </span>
            Flags & Outcomes
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Flags ({selectedFlags.length})
              </dt>
              <div className="flex flex-wrap gap-1">
                {selectedFlags.map((flag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                  >
                    {flag.flag_name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Outcomes ({selectedOutcomes.length})
              </dt>
              <div className="flex flex-wrap gap-1">
                {selectedOutcomes.map((outcome, index) => (
                  <span
                    key={index}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
                  >
                    {outcome.outcome_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ready to create */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4 className="text-lg font-medium text-green-800 mb-1">Ready to Create</h4>
        <p className="text-sm text-green-700">
          Click &quot;Create Study&quot; to finalize your configuration
        </p>
      </div>
    </div>
  );
}
