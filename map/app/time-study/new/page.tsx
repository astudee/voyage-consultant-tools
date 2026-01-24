'use client';

import { useState, useReducer, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Workflow } from '@/lib/types';
import type { TimeStudyTemplate, StructureType } from '@/lib/time-study-types';
import WizardStepper from './components/WizardStepper';
import Step1Basics from './components/Step1Basics';
import Step2Activities from './components/Step2Activities';
import Step3TimeStructure from './components/Step3TimeStructure';
import Step4FlagsOutcomes from './components/Step4FlagsOutcomes';
import Step5Review from './components/Step5Review';

// Wizard state types
export interface WizardActivity {
  id?: number;
  workflow_activity_id?: number | null;
  activity_name: string;
  is_adhoc: boolean;
  selected: boolean;
}

export interface WizardStep {
  id?: number;
  step_name: string;
  sequence_order: number;
  is_required: boolean;
}

export interface WizardFlag {
  flag_name: string;
  is_standard: boolean;
  selected: boolean;
}

export interface WizardOutcome {
  outcome_name: string;
  selected: boolean;
}

export interface WizardState {
  // Step 1
  studyName: string;
  workflowId: number | null;
  templateId: number | null;
  structureType: StructureType;
  // Step 2
  activities: WizardActivity[];
  // Step 3
  steps: WizardStep[];
  // Step 4
  flags: WizardFlag[];
  outcomes: WizardOutcome[];
}

type WizardAction =
  | { type: 'SET_STUDY_NAME'; payload: string }
  | { type: 'SET_WORKFLOW'; payload: number | null }
  | { type: 'SET_TEMPLATE'; payload: { templateId: number | null; structureType: StructureType; steps: WizardStep[] } }
  | { type: 'SET_ACTIVITIES'; payload: WizardActivity[] }
  | { type: 'TOGGLE_ACTIVITY'; payload: number }
  | { type: 'ADD_ADHOC_ACTIVITY'; payload: string }
  | { type: 'REMOVE_ADHOC_ACTIVITY'; payload: number }
  | { type: 'SET_STEPS'; payload: WizardStep[] }
  | { type: 'ADD_STEP'; payload: string }
  | { type: 'REMOVE_STEP'; payload: number }
  | { type: 'REORDER_STEPS'; payload: WizardStep[] }
  | { type: 'TOGGLE_FLAG'; payload: number }
  | { type: 'ADD_FLAG'; payload: string }
  | { type: 'TOGGLE_OUTCOME'; payload: number }
  | { type: 'ADD_OUTCOME'; payload: string };

const defaultFlags: WizardFlag[] = [
  { flag_name: 'Automatable', is_standard: true, selected: true },
  { flag_name: 'Exception', is_standard: true, selected: true },
  { flag_name: 'Training Issue', is_standard: true, selected: true },
];

const defaultOutcomes: WizardOutcome[] = [
  { outcome_name: 'Complete', selected: true },
  { outcome_name: 'Transferred', selected: true },
  { outcome_name: 'Pended', selected: true },
];

const initialState: WizardState = {
  studyName: '',
  workflowId: null,
  templateId: null,
  structureType: 'simple',
  activities: [],
  steps: [],
  flags: defaultFlags,
  outcomes: defaultOutcomes,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STUDY_NAME':
      return { ...state, studyName: action.payload };

    case 'SET_WORKFLOW':
      return { ...state, workflowId: action.payload, activities: [] };

    case 'SET_TEMPLATE':
      return {
        ...state,
        templateId: action.payload.templateId,
        structureType: action.payload.structureType,
        steps: action.payload.steps,
      };

    case 'SET_ACTIVITIES':
      return { ...state, activities: action.payload };

    case 'TOGGLE_ACTIVITY': {
      const activities = [...state.activities];
      activities[action.payload] = {
        ...activities[action.payload],
        selected: !activities[action.payload].selected,
      };
      return { ...state, activities };
    }

    case 'ADD_ADHOC_ACTIVITY': {
      const newActivity: WizardActivity = {
        activity_name: action.payload,
        is_adhoc: true,
        selected: true,
      };
      return { ...state, activities: [...state.activities, newActivity] };
    }

    case 'REMOVE_ADHOC_ACTIVITY': {
      const activities = state.activities.filter((_, i) => i !== action.payload);
      return { ...state, activities };
    }

    case 'SET_STEPS':
      return { ...state, steps: action.payload };

    case 'ADD_STEP': {
      const maxOrder = state.steps.reduce((max, s) => Math.max(max, s.sequence_order), 0);
      const newStep: WizardStep = {
        step_name: action.payload,
        sequence_order: maxOrder + 1,
        is_required: false,
      };
      return { ...state, steps: [...state.steps, newStep] };
    }

    case 'REMOVE_STEP': {
      const steps = state.steps
        .filter((_, i) => i !== action.payload)
        .map((s, i) => ({ ...s, sequence_order: i + 1 }));
      return { ...state, steps };
    }

    case 'REORDER_STEPS':
      return { ...state, steps: action.payload };

    case 'TOGGLE_FLAG': {
      const flags = [...state.flags];
      flags[action.payload] = {
        ...flags[action.payload],
        selected: !flags[action.payload].selected,
      };
      return { ...state, flags };
    }

    case 'ADD_FLAG': {
      const newFlag: WizardFlag = {
        flag_name: action.payload,
        is_standard: false,
        selected: true,
      };
      return { ...state, flags: [...state.flags, newFlag] };
    }

    case 'TOGGLE_OUTCOME': {
      const outcomes = [...state.outcomes];
      outcomes[action.payload] = {
        ...outcomes[action.payload],
        selected: !outcomes[action.payload].selected,
      };
      return { ...state, outcomes };
    }

    case 'ADD_OUTCOME': {
      const newOutcome: WizardOutcome = {
        outcome_name: action.payload,
        selected: true,
      };
      return { ...state, outcomes: [...state.outcomes, newOutcome] };
    }

    default:
      return state;
  }
}

const STEPS = ['Basics', 'Activities', 'Time Structure', 'Flags & Outcomes', 'Review'];

export default function NewStudyWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const [templates, setTemplates] = useState<TimeStudyTemplate[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates and workflows on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/time-study/templates').then((r) => r.json()),
      fetch('/api/workflows').then((r) => r.json()),
    ])
      .then(([templatesData, workflowsData]) => {
        setTemplates(templatesData.templates || []);
        setWorkflows(workflowsData.workflows || []);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load data');
        setLoading(false);
        console.error(err);
      });
  }, []);

  // Validation for each step
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Basics
        return state.studyName.trim().length > 0 && state.templateId !== null;
      case 1: // Activities
        return state.activities.some((a) => a.selected);
      case 2: // Time Structure
        return true; // Steps are optional
      case 3: // Flags & Outcomes
        return state.outcomes.some((o) => o.selected);
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    try {
      // 1. Create the study
      const studyRes = await fetch('/api/time-study/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_name: state.studyName.trim(),
          workflow_id: state.workflowId,
          template_id: state.templateId,
          structure_type: state.structureType,
        }),
      });
      const studyData = await studyRes.json();

      if (studyData.error) {
        throw new Error(studyData.error);
      }

      const studyId = studyData.id;

      // 2. Add activities
      const selectedActivities = state.activities.filter((a) => a.selected);
      for (const activity of selectedActivities) {
        await fetch(`/api/time-study/studies/${studyId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_activity_id: activity.workflow_activity_id || null,
            activity_name: activity.activity_name,
            is_adhoc: activity.is_adhoc,
          }),
        });
      }

      // 3. Add custom steps (if any beyond template)
      // Note: Template steps are already copied by the API
      // We would need to handle custom steps here if the user added any

      // 4. Add custom flags
      const selectedFlags = state.flags.filter((f) => f.selected && !f.is_standard);
      for (const flag of selectedFlags) {
        await fetch(`/api/time-study/studies/${studyId}/flags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flag_name: flag.flag_name,
            is_standard: false,
          }),
        });
      }

      // 5. Add custom outcomes
      const customOutcomes = state.outcomes.filter(
        (o) => o.selected && !['Complete', 'Transferred', 'Pended'].includes(o.outcome_name)
      );
      for (const outcome of customOutcomes) {
        await fetch(`/api/time-study/studies/${studyId}/outcomes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outcome_name: outcome.outcome_name,
          }),
        });
      }

      // Success - redirect to study list
      router.push('/time-study');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create study');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <Step1Basics
            state={state}
            dispatch={dispatch}
            templates={templates}
            workflows={workflows}
          />
        );
      case 1:
        return (
          <Step2Activities
            state={state}
            dispatch={dispatch}
            workflowId={state.workflowId}
          />
        );
      case 2:
        return <Step3TimeStructure state={state} dispatch={dispatch} />;
      case 3:
        return <Step4FlagsOutcomes state={state} dispatch={dispatch} />;
      case 4:
        return (
          <Step5Review
            state={state}
            templates={templates}
            workflows={workflows}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800">Create New Time Study</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your observation study in {STEPS.length} steps</p>
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <WizardStepper steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {renderStep()}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/time-study')}
            className="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="btn-primary px-4 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating || !canProceed()}
                className="btn-primary px-6 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Study'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
