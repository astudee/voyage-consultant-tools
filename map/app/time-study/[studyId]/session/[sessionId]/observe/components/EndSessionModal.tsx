'use client';

import { useState } from 'react';
import type { TimeStudyOutcome, TimeStudyFlag } from '@/lib/time-study-types';
import { formatDurationPrecise } from '@/lib/time-study-types';

interface EndSessionModalProps {
  outcomes: TimeStudyOutcome[];
  flags: TimeStudyFlag[];
  elapsedSeconds: number;
  initialActiveFlags: number[];
  initialNote: string;
  initialOpportunity: string;
  onSelectOutcome: (data: {
    outcomeId: number | null;
    flagIds: number[];
    notes: string;
    opportunity: string;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function EndSessionModal({
  outcomes,
  flags,
  elapsedSeconds,
  initialActiveFlags,
  initialNote,
  initialOpportunity,
  onSelectOutcome,
  onCancel,
  isSaving,
}: EndSessionModalProps) {
  const [activeFlags, setActiveFlags] = useState<number[]>(initialActiveFlags);
  const [note, setNote] = useState(initialNote);
  const [opportunity, setOpportunity] = useState(initialOpportunity);

  const handleOutcomeClick = (outcomeId: number | null) => {
    onSelectOutcome({
      outcomeId,
      flagIds: activeFlags,
      notes: note.trim(),
      opportunity: opportunity.trim(),
    });
  };

  const toggleFlag = (flagId: number) => {
    setActiveFlags(prev =>
      prev.includes(flagId)
        ? prev.filter(id => id !== flagId)
        : [...prev, flagId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4 rounded-t-lg text-center">
          <h2 className="text-lg font-semibold text-white">End Session</h2>
          <p className="text-sm text-gray-400 mt-1">
            Final observation: <span className="font-mono text-green-400">{formatDurationPrecise(elapsedSeconds)}</span>
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Outcome selection */}
          <div>
            <p className="text-sm text-gray-300 text-center mb-3">
              What was the outcome?
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {outcomes.map((outcome) => (
                <button
                  key={outcome.id}
                  onClick={() => handleOutcomeClick(outcome.id)}
                  disabled={isSaving}
                  className={`px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
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
            </div>
          </div>

          {/* Flags */}
          {flags.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Flags</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {flags.map((flag) => {
                  const isActive = activeFlags.includes(flag.id);
                  return (
                    <button
                      key={flag.id}
                      onClick={() => toggleFlag(flag.id)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
                        isActive
                          ? 'bg-blue-600 text-white border-2 border-blue-400'
                          : 'bg-transparent text-gray-400 border-2 border-gray-600 hover:border-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {flag.flag_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              disabled={isSaving}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 disabled:opacity-50"
            />
          </div>

          {/* Opportunity */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Improvement Opportunity</label>
            <input
              type="text"
              value={opportunity}
              onChange={(e) => setOpportunity(e.target.value)}
              placeholder="Describe improvement opportunity..."
              disabled={isSaving}
              className="w-full bg-gray-700 border border-purple-600/50 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
            />
          </div>

          {/* Discard button */}
          <button
            onClick={() => handleOutcomeClick(null)}
            disabled={isSaving}
            className="w-full py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Discard & End
          </button>

          {/* Cancel */}
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors disabled:opacity-50"
          >
            Continue Observing
          </button>
        </div>
      </div>
    </div>
  );
}
