'use client';

import { useState, Dispatch } from 'react';
import type { WizardState, WizardStep } from '../page';

type WizardAction =
  | { type: 'SET_STEPS'; payload: WizardStep[] }
  | { type: 'ADD_STEP'; payload: string }
  | { type: 'REMOVE_STEP'; payload: number }
  | { type: 'REORDER_STEPS'; payload: WizardStep[] };

interface Step3TimeStructureProps {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
}

export default function Step3TimeStructure({ state, dispatch }: Step3TimeStructureProps) {
  const [newStepName, setNewStepName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddStep = () => {
    const name = newStepName.trim();
    if (!name) return;

    // Check for duplicates
    const exists = state.steps.some(
      (s) => s.step_name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      alert('A step with this name already exists');
      return;
    }

    dispatch({ type: 'ADD_STEP', payload: name });
    setNewStepName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddStep();
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSteps = [...state.steps];
    const [removed] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, removed);

    // Update sequence orders
    const reordered = newSteps.map((s, i) => ({ ...s, sequence_order: i + 1 }));
    dispatch({ type: 'REORDER_STEPS', payload: reordered });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === state.steps.length - 1) return;

    const newSteps = [...state.steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];

    const reordered = newSteps.map((s, i) => ({ ...s, sequence_order: i + 1 }));
    dispatch({ type: 'REORDER_STEPS', payload: reordered });
  };

  // Simple timer - no steps
  if (state.structureType === 'simple') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Time Structure</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure how time is captured during observations
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-yellow-800 mb-2">Simple Timer</h4>
          <p className="text-sm text-yellow-700">
            You&apos;ve selected a simple timer template. Observers will use a basic start/stop timer for each observation.
          </p>
          <p className="text-sm text-yellow-600 mt-2">
            No additional time structure configuration is needed.
          </p>
        </div>
      </div>
    );
  }

  // Phases or Segments - show steps
  const isPhases = state.structureType === 'phases';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          {isPhases ? 'Phases' : 'Segments'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {isPhases
            ? 'Phases are timed sequentially. Observers mark when each phase starts.'
            : 'Segments can be timed in any order and revisited. Observers tap to switch between segments.'}
        </p>
      </div>

      {/* Steps list */}
      {state.steps.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm text-gray-500 mb-2">
            {isPhases ? 'Drag to reorder phases' : 'Drag to reorder segments'}
          </div>
          {state.steps.map((step, index) => (
            <div
              key={`${step.step_name}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 p-3 bg-white border rounded-lg
                ${draggedIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                cursor-grab active:cursor-grabbing
              `}
            >
              {/* Drag handle */}
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>

              {/* Step number */}
              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>

              {/* Step name */}
              <div className="flex-1">
                <span className="font-medium text-gray-900">{step.step_name}</span>
                {step.is_required && (
                  <span className="ml-2 text-xs text-red-500">required</span>
                )}
              </div>

              {/* Move buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveStep(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move up"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 'down')}
                  disabled={index === state.steps.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move down"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_STEP', payload: index })}
                className="p-1 text-red-400 hover:text-red-600"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No {isPhases ? 'phases' : 'segments'} defined yet.</p>
          <p className="text-sm text-gray-400 mt-1">Add at least one below.</p>
        </div>
      )}

      {/* Add new step */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add {isPhases ? 'Phase' : 'Segment'}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newStepName}
            onChange={(e) => setNewStepName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={isPhases ? 'e.g., Call End, ACW' : 'e.g., Research, Documentation'}
          />
          <button
            type="button"
            onClick={handleAddStep}
            disabled={!newStepName.trim()}
            className="btn-primary px-4 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      {/* Flow preview */}
      {state.steps.length > 1 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {isPhases ? 'Phase Flow' : 'Available Segments'}
          </h4>
          <div className="flex items-center flex-wrap gap-2">
            {state.steps.map((step, index) => (
              <div key={`preview-${index}`} className="flex items-center">
                <span
                  className={`
                    px-3 py-1 rounded text-sm
                    ${isPhases ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}
                  `}
                >
                  {step.step_name}
                </span>
                {isPhases && index < state.steps.length - 1 && (
                  <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
