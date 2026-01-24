'use client';

import { useState } from 'react';
import type { TimeStudyActivity, TimeStudyFlag, TimeStudyOutcome } from '@/lib/time-study-types';
import { formatDuration } from '@/lib/time-study-types';

interface RecordedStep {
  stepId: number;
  stepName: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  visitNumber: number;
  sequenceInObservation: number;
}

interface CodingModalProps {
  activities: TimeStudyActivity[];
  outcomes: TimeStudyOutcome[];
  flags: TimeStudyFlag[];
  elapsedSeconds: number;
  recordedSteps: RecordedStep[];
  onSave: (data: {
    activityId: number | null;
    adhocActivityName: string | null;
    outcomeId: number | null;
    flagIds: number[];
    notes: string;
    opportunity: string;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function CodingModal({
  activities,
  outcomes,
  flags,
  elapsedSeconds,
  recordedSteps,
  onSave,
  onCancel,
  isSaving,
}: CodingModalProps) {
  const [activityId, setActivityId] = useState<number | null>(null);
  const [adhocActivityName, setAdhocActivityName] = useState('');
  const [outcomeId, setOutcomeId] = useState<number | null>(null);
  const [selectedFlags, setSelectedFlags] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [opportunity, setOpportunity] = useState('');

  const handleToggleFlag = (flagId: number) => {
    setSelectedFlags((prev) =>
      prev.includes(flagId) ? prev.filter((id) => id !== flagId) : [...prev, flagId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      activityId: activityId,
      adhocActivityName: adhocActivityName.trim() || null,
      outcomeId: outcomeId,
      flagIds: selectedFlags,
      notes: notes.trim(),
      opportunity: opportunity.trim(),
    });
  };

  const activeActivities = activities.filter((a) => a.is_active);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Code Observation</h2>
            <div className="font-mono text-2xl text-green-400">{formatDuration(elapsedSeconds)}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Step Summary (if any) */}
          {recordedSteps.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Steps Recorded</h3>
              <div className="space-y-1">
                {recordedSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {step.stepName}
                      {step.visitNumber > 1 && (
                        <span className="text-gray-500 ml-1">(visit {step.visitNumber})</span>
                      )}
                    </span>
                    <span className="font-mono text-gray-300">
                      {formatDuration(step.durationSeconds)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Activity <span className="text-red-400">*</span>
            </label>
            <select
              value={activityId || ''}
              onChange={(e) => {
                setActivityId(e.target.value ? Number(e.target.value) : null);
                if (e.target.value) setAdhocActivityName('');
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an activity...</option>
              {activeActivities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.activity_name}
                  {activity.is_adhoc && ' (ad-hoc)'}
                </option>
              ))}
            </select>

            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Or describe an unplanned activity:</div>
              <input
                type="text"
                value={adhocActivityName}
                onChange={(e) => {
                  setAdhocActivityName(e.target.value);
                  if (e.target.value) setActivityId(null);
                }}
                placeholder="Ad-hoc activity name"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Outcome Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Outcome</label>
            <div className="flex flex-wrap gap-2">
              {outcomes.map((outcome) => (
                <button
                  key={outcome.id}
                  type="button"
                  onClick={() => setOutcomeId(outcomeId === outcome.id ? null : outcome.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    outcomeId === outcome.id
                      ? outcome.outcome_name === 'Complete'
                        ? 'bg-green-600 text-white'
                        : outcome.outcome_name === 'Transferred'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {outcome.outcome_name}
                </button>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Flags</label>
            <div className="flex flex-wrap gap-2">
              {flags.map((flag) => (
                <button
                  key={flag.id}
                  type="button"
                  onClick={() => handleToggleFlag(flag.id)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    selectedFlags.includes(flag.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {flag.flag_name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this observation..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Opportunity */}
          <div>
            <label htmlFor="opportunity" className="block text-sm font-medium text-gray-300 mb-2">
              Improvement Opportunity
            </label>
            <textarea
              id="opportunity"
              value={opportunity}
              onChange={(e) => setOpportunity(e.target.value)}
              placeholder="Any opportunities for improvement or automation..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              disabled={isSaving}
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSaving || (!activityId && !adhocActivityName.trim())}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                'Save Observation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
