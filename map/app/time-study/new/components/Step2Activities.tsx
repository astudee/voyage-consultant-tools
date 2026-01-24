'use client';

import { useState, useEffect, Dispatch } from 'react';
import type { WizardState, WizardActivity } from '../page';

type WizardAction =
  | { type: 'SET_ACTIVITIES'; payload: WizardActivity[] }
  | { type: 'TOGGLE_ACTIVITY'; payload: number }
  | { type: 'ADD_ADHOC_ACTIVITY'; payload: string }
  | { type: 'REMOVE_ADHOC_ACTIVITY'; payload: number };

interface Step2ActivitiesProps {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
  workflowId: number | null;
}

interface WorkflowActivity {
  id: number;
  activity_name: string;
  activity_type: string;
  grid_location: string;
}

export default function Step2Activities({ state, dispatch, workflowId }: Step2ActivitiesProps) {
  const [newAdhocName, setNewAdhocName] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch workflow activities when workflowId changes
  useEffect(() => {
    if (!workflowId) {
      // No workflow selected, just keep ad-hoc activities
      const adhocOnly = state.activities.filter((a) => a.is_adhoc);
      dispatch({ type: 'SET_ACTIVITIES', payload: adhocOnly });
      return;
    }

    setLoading(true);
    fetch(`/api/activities?workflowId=${workflowId}`)
      .then((r) => r.json())
      .then((data) => {
        const workflowActivities: WizardActivity[] = (data.activities || []).map(
          (a: WorkflowActivity) => ({
            workflow_activity_id: a.id,
            activity_name: a.activity_name,
            is_adhoc: false,
            selected: false,
          })
        );
        // Preserve ad-hoc activities
        const adhocActivities = state.activities.filter((a) => a.is_adhoc);
        dispatch({ type: 'SET_ACTIVITIES', payload: [...workflowActivities, ...adhocActivities] });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load activities:', err);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const handleAddAdhoc = () => {
    const name = newAdhocName.trim();
    if (!name) return;

    // Check for duplicates
    const exists = state.activities.some(
      (a) => a.activity_name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      alert('An activity with this name already exists');
      return;
    }

    dispatch({ type: 'ADD_ADHOC_ACTIVITY', payload: name });
    setNewAdhocName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAdhoc();
    }
  };

  const workflowActivities = state.activities.filter((a) => !a.is_adhoc);
  const adhocActivities = state.activities.filter((a) => a.is_adhoc);
  const selectedCount = state.activities.filter((a) => a.selected).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Select Activities to Observe</h3>
        <p className="text-sm text-gray-500 mt-1">
          Choose which activities observers will time during this study. You need at least one activity.
        </p>
      </div>

      {/* Selection summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
        <span className="text-sm text-blue-700">
          {selectedCount} {selectedCount === 1 ? 'activity' : 'activities'} selected
        </span>
        {selectedCount === 0 && (
          <span className="text-xs text-blue-600">Select at least one activity to continue</span>
        )}
      </div>

      {/* Workflow Activities */}
      {workflowId && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Activities from Workflow
          </h4>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading activities...</p>
            </div>
          ) : workflowActivities.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
              No activities found in this workflow. Add ad-hoc activities below.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {workflowActivities.map((activity, index) => {
                const globalIndex = state.activities.findIndex(
                  (a) => a.workflow_activity_id === activity.workflow_activity_id && !a.is_adhoc
                );
                return (
                  <label
                    key={activity.workflow_activity_id}
                    className={`
                      flex items-center gap-3 p-2 rounded cursor-pointer
                      ${activity.selected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={activity.selected}
                      onChange={() => dispatch({ type: 'TOGGLE_ACTIVITY', payload: globalIndex })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className={activity.selected ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                      {activity.activity_name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Select All / None */}
          {workflowActivities.length > 0 && (
            <div className="mt-2 flex gap-4 text-sm">
              <button
                type="button"
                onClick={() => {
                  const updated = state.activities.map((a) =>
                    a.is_adhoc ? a : { ...a, selected: true }
                  );
                  dispatch({ type: 'SET_ACTIVITIES', payload: updated });
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = state.activities.map((a) =>
                    a.is_adhoc ? a : { ...a, selected: false }
                  );
                  dispatch({ type: 'SET_ACTIVITIES', payload: updated });
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Select None
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ad-hoc Activities */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Ad-hoc Activities
          <span className="ml-2 text-xs font-normal text-gray-500">
            (won&apos;t affect the process map)
          </span>
        </h4>

        {/* Add new ad-hoc */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newAdhocName}
            onChange={(e) => setNewAdhocName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter activity name"
          />
          <button
            type="button"
            onClick={handleAddAdhoc}
            disabled={!newAdhocName.trim()}
            className="btn-primary px-4 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {/* List of ad-hoc activities */}
        {adhocActivities.length > 0 && (
          <div className="space-y-2">
            {adhocActivities.map((activity) => {
              const globalIndex = state.activities.findIndex(
                (a) => a.is_adhoc && a.activity_name === activity.activity_name
              );
              return (
                <div
                  key={activity.activity_name}
                  className={`
                    flex items-center justify-between p-2 rounded
                    ${activity.selected ? 'bg-blue-50' : 'bg-gray-50'}
                  `}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={activity.selected}
                      onChange={() => dispatch({ type: 'TOGGLE_ACTIVITY', payload: globalIndex })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className={activity.selected ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                      {activity.activity_name}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                      ad-hoc
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'REMOVE_ADHOC_ACTIVITY', payload: globalIndex })}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {adhocActivities.length === 0 && !workflowId && (
          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            Since no workflow is selected, add ad-hoc activities to observe.
          </p>
        )}
      </div>
    </div>
  );
}
