'use client';

import { useState, Dispatch } from 'react';
import type { WizardState } from '../page';

type WizardAction =
  | { type: 'TOGGLE_FLAG'; payload: number }
  | { type: 'ADD_FLAG'; payload: string }
  | { type: 'TOGGLE_OUTCOME'; payload: number }
  | { type: 'ADD_OUTCOME'; payload: string };

interface Step4FlagsOutcomesProps {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
}

export default function Step4FlagsOutcomes({ state, dispatch }: Step4FlagsOutcomesProps) {
  const [newFlagName, setNewFlagName] = useState('');
  const [newOutcomeName, setNewOutcomeName] = useState('');

  const handleAddFlag = () => {
    const name = newFlagName.trim();
    if (!name) return;

    const exists = state.flags.some(
      (f) => f.flag_name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      alert('A flag with this name already exists');
      return;
    }

    dispatch({ type: 'ADD_FLAG', payload: name });
    setNewFlagName('');
  };

  const handleAddOutcome = () => {
    const name = newOutcomeName.trim();
    if (!name) return;

    const exists = state.outcomes.some(
      (o) => o.outcome_name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      alert('An outcome with this name already exists');
      return;
    }

    dispatch({ type: 'ADD_OUTCOME', payload: name });
    setNewOutcomeName('');
  };

  const selectedFlagsCount = state.flags.filter((f) => f.selected).length;
  const selectedOutcomesCount = state.outcomes.filter((o) => o.selected).length;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Flags & Outcomes</h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure the flags and disposition outcomes observers can apply to each observation
        </p>
      </div>

      {/* Flags Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Flags
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({selectedFlagsCount} selected)
          </span>
        </h4>
        <p className="text-xs text-gray-500 mb-3">
          Flags help categorize observations. Observers can toggle multiple flags per observation.
        </p>

        <div className="space-y-2 mb-4">
          {state.flags.map((flag, index) => (
            <label
              key={flag.flag_name}
              className={`
                flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                ${flag.selected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'}
              `}
            >
              <input
                type="checkbox"
                checked={flag.selected}
                onChange={() => dispatch({ type: 'TOGGLE_FLAG', payload: index })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className={flag.selected ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                {flag.flag_name}
              </span>
              {flag.is_standard && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  standard
                </span>
              )}
            </label>
          ))}
        </div>

        {/* Add custom flag */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newFlagName}
            onChange={(e) => setNewFlagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFlag())}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add custom flag"
          />
          <button
            type="button"
            onClick={handleAddFlag}
            disabled={!newFlagName.trim()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Flag
          </button>
        </div>
      </div>

      {/* Outcomes Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Outcomes (Disposition)
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({selectedOutcomesCount} selected)
          </span>
        </h4>
        <p className="text-xs text-gray-500 mb-3">
          Outcomes describe how the work item was completed. Each observation gets exactly one outcome.
        </p>

        {selectedOutcomesCount === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            At least one outcome must be selected
          </div>
        )}

        <div className="space-y-2 mb-4">
          {state.outcomes.map((outcome, index) => {
            const isStandard = ['Complete', 'Transferred', 'Pended'].includes(outcome.outcome_name);
            return (
              <label
                key={outcome.outcome_name}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                  ${outcome.selected ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-gray-300'}
                `}
              >
                <input
                  type="checkbox"
                  checked={outcome.selected}
                  onChange={() => dispatch({ type: 'TOGGLE_OUTCOME', payload: index })}
                  className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
                <span className={outcome.selected ? 'text-green-700 font-medium' : 'text-gray-700'}>
                  {outcome.outcome_name}
                </span>
                {isStandard && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    standard
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Add custom outcome */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newOutcomeName}
            onChange={(e) => setNewOutcomeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOutcome())}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add custom outcome"
          />
          <button
            type="button"
            onClick={handleAddOutcome}
            disabled={!newOutcomeName.trim()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Outcome
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Coding Preview</h4>
        <p className="text-xs text-gray-500 mb-3">
          After each observation, observers will see this coding interface:
        </p>
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Flags</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {state.flags.filter((f) => f.selected).map((flag) => (
                <span
                  key={flag.flag_name}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                >
                  {flag.flag_name}
                </span>
              ))}
              {selectedFlagsCount === 0 && (
                <span className="text-xs text-gray-400">No flags selected</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Outcomes</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {state.outcomes.filter((o) => o.selected).map((outcome) => (
                <span
                  key={outcome.outcome_name}
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
  );
}
