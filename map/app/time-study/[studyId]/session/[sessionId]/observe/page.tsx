'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type {
  TimeStudy,
  TimeStudySession,
  TimeStudyActivity,
  TimeStudyStep,
  TimeStudyFlag,
  TimeStudyOutcome,
  TimeStudyObservation,
} from '@/lib/time-study-types';
import { formatDuration, formatDurationPrecise } from '@/lib/time-study-types';
import CodingModal from './components/CodingModal';
import EditObservationModal from './components/EditObservationModal';
import EndSessionModal from './components/EndSessionModal';

interface StudyData {
  study: TimeStudy;
  activities: TimeStudyActivity[];
  steps: TimeStudyStep[];
  flags: TimeStudyFlag[];
  outcomes: TimeStudyOutcome[];
}

interface SessionData {
  session: TimeStudySession;
  observations: TimeStudyObservation[];
}

interface ActiveStep {
  stepId: number;
  stepName: string;
  startedAt: string;
  visitNumber: number;
}

interface RecordedStep {
  stepId: number;
  stepName: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  visitNumber: number;
  sequenceInObservation: number;
}

export default function ObservationPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params.studyId as string;
  const sessionId = params.sessionId as string;

  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Activity selection (for simple timer)
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);

  // Step tracking (for phases/segments)
  const [activeStep, setActiveStep] = useState<ActiveStep | null>(null);
  const [recordedSteps, setRecordedSteps] = useState<RecordedStep[]>([]);

  // Modal states
  const [showCodingModal, setShowCodingModal] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [editingObservation, setEditingObservation] = useState<TimeStudyObservation | null>(null);
  const [savingObservation, setSavingObservation] = useState(false);

  // Fetch study and session data
  useEffect(() => {
    Promise.all([
      fetch(`/api/time-study/studies/${studyId}`).then((r) => r.json()),
      fetch(`/api/time-study/sessions/${sessionId}`).then((r) => r.json()),
    ])
      .then(([study, session]) => {
        if (study.error) throw new Error(study.error);
        if (session.error) throw new Error(session.error);
        setStudyData(study);
        setSessionData(session);

        // Auto-select activity if only one
        const activeActivities = study.activities.filter((a: TimeStudyActivity) => a.is_active);
        if (activeActivities.length === 1) {
          setSelectedActivityId(activeActivities[0].id);
        }

        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      });
  }, [studyId, sessionId]);

  // Timer effect - update every 100ms for smooth display
  useEffect(() => {
    if (isTimerRunning && timerStartedAt) {
      timerRef.current = setInterval(() => {
        const startTime = new Date(timerStartedAt).getTime();
        const now = Date.now();
        setElapsedSeconds((now - startTime) / 1000);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, timerStartedAt]);

  const startTimer = useCallback(() => {
    const now = new Date().toISOString();
    setTimerStartedAt(now);
    setIsTimerRunning(true);
    setElapsedSeconds(0);
    setRecordedSteps([]);

    // For phases/segments, auto-start first step
    if (studyData && studyData.study.structure_type !== 'simple' && studyData.steps.length > 0) {
      const firstStep = studyData.steps[0];
      setActiveStep({
        stepId: firstStep.id,
        stepName: firstStep.step_name,
        startedAt: now,
        visitNumber: 1,
      });
    }
  }, [studyData]);

  // Quick log for simple timer - tap outcome = log + restart
  const handleQuickLog = useCallback(
    async (outcomeId: number) => {
      if (!timerStartedAt || !studyData || !sessionData) {
        console.error('handleQuickLog: missing required data', { timerStartedAt, studyData: !!studyData, sessionData: !!sessionData });
        return;
      }

      setSavingObservation(true);
      setError(null);

      try {
        const endedAt = new Date().toISOString();
        const observationNumber = (sessionData.observations?.length || 0) + 1;
        const totalDurationSeconds = Math.floor(elapsedSeconds);

        const payload = {
          study_activity_id: selectedActivityId,
          adhoc_activity_name: null,
          observation_number: observationNumber,
          started_at: timerStartedAt,
          ended_at: endedAt,
          total_duration_seconds: totalDurationSeconds,
          outcome_id: outcomeId,
          notes: null,
          opportunity: null,
          flag_ids: [],
          steps: [],
        };

        const response = await fetch(`/api/time-study/sessions/${sessionId}/observations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (result.error) {
          console.error('API error:', result);
          throw new Error(result.error);
        }

        // Refresh session data
        const sessionRes = await fetch(`/api/time-study/sessions/${sessionId}`);
        const newSessionData = await sessionRes.json();
        if (newSessionData.error) {
          console.error('Session refresh error:', newSessionData);
          throw new Error(newSessionData.error);
        }
        setSessionData(newSessionData);

        // Restart timer immediately
        const now = new Date().toISOString();
        setTimerStartedAt(now);
        setElapsedSeconds(0);
      } catch (err) {
        console.error('handleQuickLog error:', err);
        setError(err instanceof Error ? err.message : 'Failed to save observation');
      } finally {
        setSavingObservation(false);
      }
    },
    [timerStartedAt, studyData, sessionData, sessionId, selectedActivityId, elapsedSeconds]
  );

  // Discard - reset timer without logging
  const handleDiscard = useCallback(() => {
    const now = new Date().toISOString();
    setTimerStartedAt(now);
    setElapsedSeconds(0);
    setRecordedSteps([]);
    setActiveStep(null);
  }, []);

  // Stop timer for phases/segments (opens modal)
  const stopTimerForCoding = useCallback(() => {
    const now = new Date().toISOString();

    // If there's an active step, close it
    if (activeStep) {
      const stepStartTime = new Date(activeStep.startedAt).getTime();
      const stepEndTime = new Date(now).getTime();
      const stepDuration = Math.floor((stepEndTime - stepStartTime) / 1000);

      setRecordedSteps((prev) => [
        ...prev,
        {
          stepId: activeStep.stepId,
          stepName: activeStep.stepName,
          startedAt: activeStep.startedAt,
          endedAt: now,
          durationSeconds: stepDuration,
          visitNumber: activeStep.visitNumber,
          sequenceInObservation: prev.length + 1,
        },
      ]);
      setActiveStep(null);
    }

    setIsTimerRunning(false);
    setShowCodingModal(true);
  }, [activeStep]);

  const switchStep = useCallback(
    (step: TimeStudyStep) => {
      if (!isTimerRunning) return;

      const now = new Date().toISOString();

      // Close current step if active
      if (activeStep) {
        const stepStartTime = new Date(activeStep.startedAt).getTime();
        const stepEndTime = new Date(now).getTime();
        const stepDuration = Math.floor((stepEndTime - stepStartTime) / 1000);

        setRecordedSteps((prev) => [
          ...prev,
          {
            stepId: activeStep.stepId,
            stepName: activeStep.stepName,
            startedAt: activeStep.startedAt,
            endedAt: now,
            durationSeconds: stepDuration,
            visitNumber: activeStep.visitNumber,
            sequenceInObservation: prev.length + 1,
          },
        ]);
      }

      // Calculate visit number for new step
      const existingVisits = recordedSteps.filter((rs) => rs.stepId === step.id).length;
      const currentVisit = activeStep?.stepId === step.id ? 1 : 0;

      setActiveStep({
        stepId: step.id,
        stepName: step.step_name,
        startedAt: now,
        visitNumber: existingVisits + currentVisit + 1,
      });
    },
    [isTimerRunning, activeStep, recordedSteps]
  );

  // Save observation from CodingModal (phases/segments)
  const handleSaveObservation = async (data: {
    activityId: number | null;
    adhocActivityName: string | null;
    outcomeId: number | null;
    flagIds: number[];
    notes: string;
    opportunity: string;
  }) => {
    if (!timerStartedAt || !sessionData) return;

    setSavingObservation(true);
    setError(null);

    try {
      const endedAt = new Date().toISOString();
      const observationNumber = (sessionData.observations?.length || 0) + 1;
      const totalDurationSeconds = Math.floor(elapsedSeconds);

      const response = await fetch(`/api/time-study/sessions/${sessionId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_activity_id: data.activityId,
          adhoc_activity_name: data.adhocActivityName,
          observation_number: observationNumber,
          started_at: timerStartedAt,
          ended_at: endedAt,
          total_duration_seconds: totalDurationSeconds,
          outcome_id: data.outcomeId,
          notes: data.notes || null,
          opportunity: data.opportunity || null,
          flag_ids: data.flagIds,
          steps: recordedSteps.map((rs) => ({
            step_id: rs.stepId,
            visit_number: rs.visitNumber,
            started_at: rs.startedAt,
            ended_at: rs.endedAt,
            duration_seconds: rs.durationSeconds,
            sequence_in_observation: rs.sequenceInObservation,
          })),
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Refresh session data
      const sessionRes = await fetch(`/api/time-study/sessions/${sessionId}`);
      const newSessionData = await sessionRes.json();
      setSessionData(newSessionData);

      // Reset timer state
      setTimerStartedAt(null);
      setElapsedSeconds(0);
      setRecordedSteps([]);
      setShowCodingModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save observation');
    } finally {
      setSavingObservation(false);
    }
  };

  const handleCancelCodingModal = () => {
    setShowCodingModal(false);
    setTimerStartedAt(null);
    setElapsedSeconds(0);
    setRecordedSteps([]);
    setActiveStep(null);
  };

  // End session flow
  const handleEndSessionClick = () => {
    if (isTimerRunning && timerStartedAt) {
      // Timer is running - show modal for final observation
      setShowEndSessionModal(true);
    } else {
      // Timer not running - just end session
      endSessionDirectly();
    }
  };

  const endSessionDirectly = async () => {
    try {
      await fetch(`/api/time-study/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          ended_at: new Date().toISOString(),
        }),
      });
      router.push(`/time-study/${studyId}/summary`);
    } catch (err) {
      setError('Failed to end session');
    }
  };

  const handleEndSessionWithOutcome = async (outcomeId: number | null) => {
    if (!timerStartedAt || !sessionData) {
      await endSessionDirectly();
      return;
    }

    setSavingObservation(true);

    try {
      // Log final observation if outcome selected
      if (outcomeId !== null) {
        const endedAt = new Date().toISOString();
        const observationNumber = (sessionData.observations?.length || 0) + 1;
        const totalDurationSeconds = Math.floor(elapsedSeconds);

        await fetch(`/api/time-study/sessions/${sessionId}/observations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            study_activity_id: selectedActivityId,
            adhoc_activity_name: null,
            observation_number: observationNumber,
            started_at: timerStartedAt,
            ended_at: endedAt,
            total_duration_seconds: totalDurationSeconds,
            outcome_id: outcomeId,
            notes: null,
            opportunity: null,
            flag_ids: [],
            steps: [],
          }),
        });
      }

      // End session
      await endSessionDirectly();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save final observation');
      setSavingObservation(false);
    }
  };

  // Edit observation
  const handleEditObservation = (obs: TimeStudyObservation) => {
    setEditingObservation(obs);
  };

  const handleSaveEditedObservation = async (data: {
    activityId: number | null;
    adhocActivityName: string | null;
    outcomeId: number | null;
    flagIds: number[];
    notes: string;
    opportunity: string;
  }) => {
    if (!editingObservation) return;

    setSavingObservation(true);
    setError(null);

    try {
      const response = await fetch(`/api/time-study/observations/${editingObservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_activity_id: data.activityId,
          adhoc_activity_name: data.adhocActivityName,
          outcome_id: data.outcomeId,
          notes: data.notes || null,
          opportunity: data.opportunity || null,
          flag_ids: data.flagIds,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Refresh session data
      const sessionRes = await fetch(`/api/time-study/sessions/${sessionId}`);
      const newSessionData = await sessionRes.json();
      setSessionData(newSessionData);

      setEditingObservation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update observation');
    } finally {
      setSavingObservation(false);
    }
  };

  // Calculate totals
  const totalObservations = sessionData?.observations?.length || 0;
  const totalDuration = sessionData?.observations?.reduce(
    (sum, obs) => sum + (obs.total_duration_seconds || 0),
    0
  ) || 0;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!studyData || !sessionData) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400">{error || 'Session not found'}</p>
          <Link href="/time-study" className="text-blue-400 hover:underline mt-4 block">
            Back to Studies
          </Link>
        </div>
      </div>
    );
  }

  const { study, activities, steps, flags, outcomes } = studyData;
  const { session, observations } = sessionData;
  const isSimpleTimer = study.structure_type === 'simple';
  const activeActivities = activities.filter((a) => a.is_active);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header - minimal */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/time-study/${studyId}/summary`}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-sm font-semibold">{study.study_name}</h1>
            <p className="text-xs text-gray-500">
              {session.observer_name}
              {session.observed_worker_name && ` → ${session.observed_worker_name}`}
            </p>
          </div>
        </div>

        {/* Activity selector for simple timer with multiple activities */}
        {isSimpleTimer && activeActivities.length > 1 && (
          <select
            value={selectedActivityId || ''}
            onChange={(e) => setSelectedActivityId(e.target.value ? Number(e.target.value) : null)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="">Select activity</option>
            {activeActivities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.activity_name}
              </option>
            ))}
          </select>
        )}
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timer Section */}
        <div className="flex-shrink-0 bg-gray-800 p-4">
          <div className="max-w-md mx-auto text-center">
            {/* Timer Display */}
            <div
              className={`font-mono text-5xl tracking-wider mb-4 ${
                isTimerRunning ? 'text-green-400' : 'text-gray-500'
              }`}
            >
              {formatDurationPrecise(elapsedSeconds)}
            </div>

            {/* Simple Timer: Outcome buttons + Discard */}
            {isSimpleTimer && (
              <>
                {!isTimerRunning ? (
                  <button
                    onClick={startTimer}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-lg text-xl font-semibold transition-colors mb-3"
                  >
                    ▶ Start
                  </button>
                ) : (
                  <>
                    {/* Outcome buttons */}
                    <div className="flex flex-wrap gap-2 justify-center mb-3">
                      {outcomes.map((outcome) => (
                        <button
                          key={outcome.id}
                          onClick={() => handleQuickLog(outcome.id)}
                          disabled={savingObservation || (!selectedActivityId && activeActivities.length > 1)}
                          className={`px-6 py-3 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50 ${
                            outcome.outcome_name === 'Complete'
                              ? 'bg-green-600 hover:bg-green-500'
                              : outcome.outcome_name === 'Transferred'
                              ? 'bg-yellow-600 hover:bg-yellow-500'
                              : outcome.outcome_name === 'Pended'
                              ? 'bg-orange-600 hover:bg-orange-500'
                              : 'bg-blue-600 hover:bg-blue-500'
                          }`}
                        >
                          {outcome.outcome_name}
                        </button>
                      ))}
                    </div>

                    {/* Discard button */}
                    <button
                      onClick={handleDiscard}
                      className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    >
                      ✕ Discard
                    </button>
                  </>
                )}
              </>
            )}

            {/* Phases/Segments: Start/Stop + Steps */}
            {!isSimpleTimer && (
              <>
                <div className="flex justify-center gap-4 mb-4">
                  {!isTimerRunning ? (
                    <button
                      onClick={startTimer}
                      className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-lg font-semibold transition-colors"
                    >
                      ▶ Start
                    </button>
                  ) : (
                    <button
                      onClick={stopTimerForCoding}
                      className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-500 rounded-lg text-lg font-semibold transition-colors"
                    >
                      ■ Stop & Code
                    </button>
                  )}
                </div>

                {/* Steps UI */}
                {steps.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">
                      {study.structure_type === 'phases' ? 'Phases' : 'Segments'}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {steps.map((step) => {
                        const isActive = activeStep?.stepId === step.id;
                        const completedVisits = recordedSteps.filter((rs) => rs.stepId === step.id).length;

                        return (
                          <button
                            key={step.id}
                            onClick={() => switchStep(step)}
                            disabled={!isTimerRunning}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors relative ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : isTimerRunning
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {step.step_name}
                            {completedVisits > 0 && (
                              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                                {completedVisits}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Observations List */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-md mx-auto">
            {(!observations || observations.length === 0) ? (
              <p className="text-gray-500 text-center py-8 text-sm">
                {isTimerRunning ? 'Tap an outcome when done' : 'Tap Start to begin'}
              </p>
            ) : (
              <>
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-1 px-3 py-2 text-xs text-gray-500 border-b border-gray-700 sticky top-0 bg-gray-900">
                  <div className="col-span-2">Ob</div>
                  <div className="col-span-3">Time</div>
                  <div className="col-span-3">Outcome</div>
                  <div className="col-span-4">Activity</div>
                </div>

                {/* Observation Rows */}
                <div className="divide-y divide-gray-800">
                  {[...observations].reverse().map((obs) => (
                    <button
                      key={obs.id}
                      onClick={() => handleEditObservation(obs)}
                      className="w-full grid grid-cols-12 gap-1 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left items-center"
                    >
                      <div className="col-span-2 text-gray-400 text-sm">
                        #{obs.observation_number}
                      </div>
                      <div className="col-span-3 font-mono text-sm">
                        {formatDuration(obs.total_duration_seconds)}
                      </div>
                      <div className="col-span-3">
                        {obs.outcome_name && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              obs.outcome_name === 'Complete'
                                ? 'bg-green-900/50 text-green-400'
                                : obs.outcome_name === 'Transferred'
                                ? 'bg-yellow-900/50 text-yellow-400'
                                : obs.outcome_name === 'Pended'
                                ? 'bg-orange-900/50 text-orange-400'
                                : 'bg-blue-900/50 text-blue-400'
                            }`}
                          >
                            {obs.outcome_name}
                          </span>
                        )}
                      </div>
                      <div className="col-span-4 text-xs text-gray-400 truncate flex items-center gap-1">
                        <span className="truncate">
                          {obs.activity_name || obs.adhoc_activity_name || '—'}
                        </span>
                        {(obs.notes || obs.opportunity || (obs.flags && obs.flags.length > 0)) && (
                          <span className="text-gray-600 flex-shrink-0">✎</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Footer with totals */}
                <div className="border-t border-gray-700 px-3 py-2 text-xs text-gray-500 sticky bottom-0 bg-gray-900">
                  {totalObservations} observation{totalObservations !== 1 ? 's' : ''} · {formatDuration(totalDuration)} total
                </div>
              </>
            )}
          </div>
        </div>

        {/* End Session Button */}
        <div className="flex-shrink-0 p-3 border-t border-gray-700">
          <button
            onClick={handleEndSessionClick}
            className="w-full max-w-md mx-auto block py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            ■ End Session
          </button>
        </div>
      </div>

      {/* Coding Modal (for phases/segments) */}
      {showCodingModal && (
        <CodingModal
          activities={activities}
          outcomes={outcomes}
          flags={flags}
          elapsedSeconds={elapsedSeconds}
          recordedSteps={recordedSteps}
          onSave={handleSaveObservation}
          onCancel={handleCancelCodingModal}
          isSaving={savingObservation}
        />
      )}

      {/* Edit Observation Modal */}
      {editingObservation && (
        <EditObservationModal
          observation={editingObservation}
          activities={activities}
          outcomes={outcomes}
          flags={flags}
          onSave={handleSaveEditedObservation}
          onCancel={() => setEditingObservation(null)}
          isSaving={savingObservation}
        />
      )}

      {/* End Session Modal */}
      {showEndSessionModal && (
        <EndSessionModal
          outcomes={outcomes}
          elapsedSeconds={elapsedSeconds}
          onSelectOutcome={handleEndSessionWithOutcome}
          onCancel={() => setShowEndSessionModal(false)}
          isSaving={savingObservation}
        />
      )}
    </div>
  );
}
