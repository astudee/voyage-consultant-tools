'use client';

import type { TimeStudyOutcome } from '@/lib/time-study-types';
import { formatDurationPrecise } from '@/lib/time-study-types';

interface EndSessionModalProps {
  outcomes: TimeStudyOutcome[];
  elapsedSeconds: number;
  onSelectOutcome: (outcomeId: number | null) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function EndSessionModal({
  outcomes,
  elapsedSeconds,
  onSelectOutcome,
  onCancel,
  isSaving,
}: EndSessionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4 rounded-t-lg text-center">
          <h2 className="text-lg font-semibold text-white">End Session</h2>
          <p className="text-sm text-gray-400 mt-1">
            Final observation: <span className="font-mono text-green-400">{formatDurationPrecise(elapsedSeconds)}</span>
          </p>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-300 text-center mb-4">
            What was the outcome of this observation?
          </p>

          {/* Outcome buttons */}
          <div className="space-y-2">
            {outcomes.map((outcome) => (
              <button
                key={outcome.id}
                onClick={() => onSelectOutcome(outcome.id)}
                disabled={isSaving}
                className={`w-full py-3 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50 ${
                  outcome.outcome_name === 'Complete'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : outcome.outcome_name === 'Transferred'
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                    : outcome.outcome_name === 'Pended'
                    ? 'bg-orange-600 hover:bg-orange-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {outcome.outcome_name}
              </button>
            ))}

            {/* Discard button */}
            <button
              onClick={() => onSelectOutcome(null)}
              disabled={isSaving}
              className="w-full py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Discard & End
            </button>
          </div>

          {/* Cancel */}
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="w-full mt-4 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors disabled:opacity-50"
          >
            Continue Observing
          </button>
        </div>
      </div>
    </div>
  );
}
