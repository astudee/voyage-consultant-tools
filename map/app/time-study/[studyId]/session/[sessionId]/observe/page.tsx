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
import { formatDuration } from '@/lib/time-study-types';
import CodingModal from './components/CodingModal';

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

  // Step tracking (for phases/segments)
  const [activeStep, setActiveStep] = useState<ActiveStep | null>(null);
  const [recordedSteps, setRecordedSteps] = useState<RecordedStep[]>([]);

  // Coding modal state
  const [showCodingModal, setShowCodingModal] = useState(false);
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
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      });
  }, [studyId, sessionId]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timerStartedAt) {
      timerRef.current = setInterval(() => {
        const startTime = new Date(timerStartedAt).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
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

  const stopTimer = useCallback(() => {
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

  const handleSaveObservation = async (data: {
    activityId: number | null;
    adhocActivityName: string | null;
    outcomeId: number | null;
    flagIds: number[];
    notes: string;
    opportunity: string;
  }) => {
    if (!timerStartedAt) return;

    setSavingObservation(true);
    setError(null);

    try {
      const endedAt = new Date().toISOString();
      const observationNumber = (sessionData?.observations?.length || 0) + 1;
      const totalDurationSeconds = elapsedSeconds;

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

      // Refresh session data to show new observation
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

  const handleCancelObservation = () => {
    setShowCodingModal(false);
    setTimerStartedAt(null);
    setElapsedSeconds(0);
    setRecordedSteps([]);
    setActiveStep(null);
  };

  const handleEndSession = async () => {
    if (
      !confirm(
        'Are you sure you want to end this session? Make sure you have saved all observations.'
      )
    ) {
      return;
    }

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

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/time-study/${studyId}/summary`}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{study.study_name}</h1>
            <p className="text-xs text-gray-400">
              Observer: {session.observer_name}
              {session.observed_worker_name && ` | Worker: ${session.observed_worker_name}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleEndSession}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          End Session
        </button>
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timer Section */}
        <div className="flex-shrink-0 bg-gray-800 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Timer Display */}
            <div className="text-center mb-6">
              <div
                className={`font-mono text-6xl tracking-wider ${
                  isTimerRunning ? 'text-green-400' : 'text-gray-500'
                }`}
              >
                {formatDuration(elapsedSeconds)}
              </div>
              <p className="text-gray-500 text-sm mt-2">
                Observation #{(observations?.length || 0) + 1}
              </p>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center gap-4">
              {!isTimerRunning ? (
                <button
                  onClick={startTimer}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-lg font-semibold transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Start
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-500 rounded-lg text-lg font-semibold transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" />
                  </svg>
                  Stop
                </button>
              )}
            </div>

            {/* Steps UI for phases/segments */}
            {study.structure_type !== 'simple' && steps.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  {study.structure_type === 'phases' ? 'Phases' : 'Segments'}
                </h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {steps.map((step) => {
                    const isActive = activeStep?.stepId === step.id;
                    const completedVisits = recordedSteps.filter((rs) => rs.stepId === step.id)
                      .length;

                    return (
                      <button
                        key={step.id}
                        onClick={() => switchStep(step)}
                        disabled={!isTimerRunning}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : isTimerRunning
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {step.step_name}
                        {completedVisits > 0 && (
                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                            {completedVisits}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Observations List */}
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">
              Observations ({observations?.length || 0})
            </h2>

            {!observations || observations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No observations recorded yet. Click Start to begin timing.
              </p>
            ) : (
              <div className="space-y-3">
                {observations.map((obs) => (
                  <div
                    key={obs.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">#{obs.observation_number}</span>
                          <span className="font-medium">
                            {obs.activity_name || obs.adhoc_activity_name || 'No activity'}
                          </span>
                          {obs.outcome_name && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                obs.outcome_name === 'Complete'
                                  ? 'bg-green-900 text-green-300'
                                  : obs.outcome_name === 'Transferred'
                                  ? 'bg-yellow-900 text-yellow-300'
                                  : 'bg-orange-900 text-orange-300'
                              }`}
                            >
                              {obs.outcome_name}
                            </span>
                          )}
                        </div>
                        {obs.notes && (
                          <p className="text-sm text-gray-400 mt-1">{obs.notes}</p>
                        )}
                        {obs.flags && obs.flags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {obs.flags.map((flag) => (
                              <span
                                key={flag.id}
                                className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded"
                              >
                                {flag.flag_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-lg">
                          {formatDuration(obs.total_duration_seconds)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coding Modal */}
      {showCodingModal && (
        <CodingModal
          activities={activities}
          outcomes={outcomes}
          flags={flags}
          elapsedSeconds={elapsedSeconds}
          recordedSteps={recordedSteps}
          onSave={handleSaveObservation}
          onCancel={handleCancelObservation}
          isSaving={savingObservation}
        />
      )}
    </div>
  );
}
