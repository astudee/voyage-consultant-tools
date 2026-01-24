import type { Dispatch } from 'react';
import type { WizardState, WizardStep } from '../page';
import type { TimeStudyTemplate } from '@/lib/snowflake-time-study';
import type { Workflow } from '@/lib/types';
import type { StructureType } from '@/lib/time-study-types';

type WizardAction =
  | { type: 'SET_STUDY_NAME'; payload: string }
  | { type: 'SET_WORKFLOW'; payload: number | null }
  | { type: 'SET_TEMPLATE'; payload: { templateId: number | null; structureType: StructureType; steps: WizardStep[] } };

interface Step1BasicsProps {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
  templates: TimeStudyTemplate[];
  workflows: Workflow[];
}

const structureTypeDescriptions: Record<StructureType, string> = {
  simple: 'Single start/stop timer - best for back-office tasks, indexing, queue transactions',
  phases: 'Sequential steps that must be completed in order - best for contact center, field service',
  segments: 'Flexible segments that can be visited in any order and revisited - best for detailed analysis',
};

export default function Step1Basics({ state, dispatch, templates, workflows }: Step1BasicsProps) {
  const handleTemplateSelect = (template: TimeStudyTemplate) => {
    const steps: WizardStep[] = (template.steps || []).map((s) => ({
      id: s.id,
      step_name: s.step_name,
      sequence_order: s.sequence_order,
      is_required: s.is_required,
    }));

    dispatch({
      type: 'SET_TEMPLATE',
      payload: {
        templateId: template.id,
        structureType: template.structure_type,
        steps,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Study Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Study Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={state.studyName}
          onChange={(e) => dispatch({ type: 'SET_STUDY_NAME', payload: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Claims Intake - January 2026"
          autoFocus
        />
        <p className="mt-1 text-xs text-gray-500">
          Give your study a descriptive name that identifies the process and timeframe
        </p>
      </div>

      {/* Workflow Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Workflow (Optional)
        </label>
        <select
          value={state.workflowId || ''}
          onChange={(e) => dispatch({ type: 'SET_WORKFLOW', payload: e.target.value ? parseInt(e.target.value) : null })}
          className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- No workflow (ad-hoc activities only) --</option>
          {workflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.workflow_name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Link to a workflow to select activities from the process map
        </p>
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Time Structure Template <span className="text-red-500">*</span>
        </label>
        <div className="grid gap-3">
          {templates.map((template) => {
            const isSelected = state.templateId === template.id;
            const stepCount = template.steps?.length || 0;

            return (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`
                  p-4 border-2 rounded-lg cursor-pointer transition-colors
                  ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                        {template.template_name}
                      </span>
                      <span
                        className={`
                          text-xs px-2 py-0.5 rounded
                          ${template.structure_type === 'simple' ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${template.structure_type === 'phases' ? 'bg-purple-100 text-purple-700' : ''}
                          ${template.structure_type === 'segments' ? 'bg-indigo-100 text-indigo-700' : ''}
                        `}
                      >
                        {template.structure_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    {stepCount > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Steps: {template.steps?.map((s) => s.step_name).join(' → ')}
                      </p>
                    )}
                  </div>
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center ml-4 flex-shrink-0
                      ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                    `}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Structure Type Info */}
      {state.templateId && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">About this template</h4>
          <p className="text-sm text-gray-600">
            {structureTypeDescriptions[state.structureType]}
          </p>
          {state.structureType === 'simple' && (
            <p className="text-sm text-gray-500 mt-2">
              You&apos;ll use a simple start/stop timer for each observation.
            </p>
          )}
          {state.structureType === 'phases' && (
            <p className="text-sm text-gray-500 mt-2">
              During observation, you&apos;ll mark when each phase starts. Phases proceed in sequence.
            </p>
          )}
          {state.structureType === 'segments' && (
            <p className="text-sm text-gray-500 mt-2">
              During observation, you can tap any segment to start timing it. Segments can be revisited.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
