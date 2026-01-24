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

  // Debounce ref to prevent double-clicks
  const lastClickTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 200; // Minimum time between clicks (reduced from 500ms)

  // Inline annotation state (for quick logging)
  const [activeFlags, setActiveFlags] = useState<number[]>([]);
  const [pendingNote, setPendingNote] = useState('');
  const [pendingOpportunity, setPendingOpportunity] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showOpportunityInput, setShowOpportunityInput] = useState(false);

  // ACW state (for phases/contact center)
  const [isInACW, setIsInACW] = useState(false);
  const [callEndedAt, setCallEndedAt] = useState<string | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(0)

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
  // Uses optimistic updates for snappy UX
  const handleQuickLog = useCallback(
    async (outcomeId: number) => {
      // Debounce - prevent double-clicks
      const now = Date.now();
      if (now - lastClickTimeRef.current < DEBOUNCE_MS) {
        console.log('handleQuickLog: debounced, too fast');
        return;
      }
      lastClickTimeRef.current = now;

      if (!timerStartedAt || !studyData || !sessionData) {
        console.error('handleQuickLog: missing required data', { timerStartedAt, studyData: !!studyData, sessionData: !!sessionData });
        return;
      }

      // Already saving - prevent concurrent saves
      if (savingObservation) {
        console.log('handleQuickLog: already saving, skipped');
        return;
      }

      const endedAt = new Date().toISOString();
      const observationNumber = (sessionData.observations?.length || 0) + 1;
      const totalDurationSeconds = Math.floor(elapsedSeconds);

      // Calculate call and ACW durations for phases mode
      let callDuration: number | null = null;
      let acwDuration: number | null = null;

      if (isInACW && callEndedAt) {
        // In ACW mode: call duration was locked, ACW is time since then
        callDuration = callDurationSeconds;
        acwDuration = totalDurationSeconds - callDurationSeconds;
      } else if (studyData.study.structure_type === 'phases') {
        // Phases mode but no ACW: all time is call time
        callDuration = totalDurationSeconds;
        acwDuration = null;
      }

      // Find outcome name for optimistic update
      const outcome = studyData.outcomes.find((o) => o.id === outcomeId);
      const selectedActivity = studyData.activities.find((a) => a.id === selectedActivityId);

      // Capture current annotations before resetting
      const flagsToSave = [...activeFlags];
      const noteToSave = pendingNote.trim() || null;
      const opportunityToSave = pendingOpportunity.trim() || null;

      // Get flag names for optimistic update display
      const flagObjects = studyData.flags.filter(f => flagsToSave.includes(f.id));

      // OPTIMISTIC UPDATE: Add observation to list immediately
      const optimisticObservation: TimeStudyObservation = {
        id: -observationNumber, // Temporary negative ID
        session_id: parseInt(sessionId, 10),
        study_activity_id: selectedActivityId,
        activity_name: selectedActivity?.activity_name || null,
        adhoc_activity_name: null,
        observation_number: observationNumber,
        started_at: timerStartedAt,
        ended_at: endedAt,
        total_duration_seconds: totalDurationSeconds,
        call_duration_seconds: callDuration,
        acw_duration_seconds: acwDuration,
        outcome_id: outcomeId,
        outcome_name: outcome?.outcome_name || null,
        notes: noteToSave,
        opportunity: opportunityToSave,
        created_at: endedAt,
        flags: flagObjects,
      };

      setSessionData((prev) => prev ? {
        ...prev,
        observations: [...(prev.observations || []), optimisticObservation],
      } : prev);

      // RESTART TIMER IMMEDIATELY for snappy UX
      const restartTime = new Date().toISOString();
      setTimerStartedAt(restartTime);
      setElapsedSeconds(0);

      // Clear annotations after logging
      setActiveFlags([]);
      setPendingNote('');
      setPendingOpportunity('');
      setShowNoteInput(false);
      setShowOpportunityInput(false);

      // Reset ACW state
      setIsInACW(false);
      setCallEndedAt(null);
      setCallDurationSeconds(0);

      // Now do the actual API call in background
      setSavingObservation(true);
      setError(null);

      try {
        const payload = {
          study_activity_id: selectedActivityId,
          adhoc_activity_name: null,
          observation_number: observationNumber,
          started_at: timerStartedAt,
          ended_at: endedAt,
          total_duration_seconds: totalDurationSeconds,
          call_duration_seconds: callDuration,
          acw_duration_seconds: acwDuration,
          outcome_id: outcomeId,
          notes: noteToSave,
          opportunity: opportunityToSave,
          flag_ids: flagsToSave,
          steps: [],
        };

        console.log('handleQuickLog: saving observation', observationNumber);
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
        console.log('handleQuickLog: observation saved, id:', result.id);

        // Refresh session data to get real IDs (do this in background, don't block UX)
        fetch(`/api/time-study/sessions/${sessionId}`)
          .then((res) => res.json())
          .then((newSessionData) => {
            if (!newSessionData.error) {
              setSessionData(newSessionData);
              console.log('Session refreshed, observations:', newSessionData.observations?.length || 0);
            } else {
              console.error('Session refresh error:', newSessionData);
            }
          })
          .catch((err) => {
            console.error('Session refresh failed:', err);
          });

      } catch (err) {
        console.error('handleQuickLog error:', err);
        setError(err instanceof Error ? err.message : 'Failed to save observation');
        // Revert optimistic update on error
        setSessionData((prev) => prev ? {
          ...prev,
          observations: (prev.observations || []).filter((o) => o.id !== optimisticObservation.id),
        } : prev);
      } finally {
        setSavingObservation(false);
      }
    },
    [timerStartedAt, studyData, sessionData, sessionId, selectedActivityId, elapsedSeconds, savingObservation, isInACW, callEndedAt, callDurationSeconds, activeFlags, pendingNote, pendingOpportunity]
  );

  // Discard - reset timer without logging
  const handleDiscard = useCallback(() => {
    const now = new Date().toISOString();
    setTimerStartedAt(now);
    setElapsedSeconds(0);
    setRecordedSteps([]);
    setActiveStep(null);
    setIsInACW(false);
    setCallEndedAt(null);
    setCallDurationSeconds(0);
  }, []);

  // Add ACW - locks call time and starts ACW tracking
  const handleAddACW = useCallback(() => {
    if (!isTimerRunning || !timerStartedAt) return;

    const now = new Date().toISOString();
    const callDuration = Math.floor(elapsedSeconds);

    setCallEndedAt(now);
    setCallDurationSeconds(callDuration);
    setIsInACW(true);
  }, [isTimerRunning, timerStartedAt, elapsedSeconds]);

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

  const handleEndSessionWithOutcome = async (data: {
    outcomeId: number | null;
    flagIds: number[];
    notes: string;
    opportunity: string;
  }) => {
    if (!timerStartedAt || !sessionData) {
      await endSessionDirectly();
      return;
    }

    setSavingObservation(true);

    try {
      // Log final observation if outcome selected
      if (data.outcomeId !== null) {
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
            outcome_id: data.outcomeId,
            notes: data.notes || null,
            opportunity: data.opportunity || null,
            flag_ids: data.flagIds,
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

  // Calculate totals and averages
  const totalObservations = sessionData?.observations?.length || 0;
  const totalDuration = sessionData?.observations?.reduce(
    (sum, obs) => sum + (obs.total_duration_seconds || 0),
    0
  ) || 0;

  // Calculate Contact Center averages (for phases mode)
  const observationsWithCall = sessionData?.observations?.filter(obs => obs.call_duration_seconds != null) || [];
  const observationsWithACW = sessionData?.observations?.filter(obs => obs.acw_duration_seconds != null) || [];

  const avgCallDuration = observationsWithCall.length > 0
    ? observationsWithCall.reduce((sum, obs) => sum + (obs.call_duration_seconds || 0), 0) / observationsWithCall.length
    : null;

  const avgACWDuration = observationsWithACW.length > 0
    ? observationsWithACW.reduce((sum, obs) => sum + (obs.acw_duration_seconds || 0), 0) / observationsWithACW.length
    : null;

  const avgAHT = totalObservations > 0
    ? totalDuration / totalObservations
    : null;

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
            {/* Activity selector - prominent center position */}
            {isSimpleTimer && activeActivities.length > 1 && (
              <div className="mb-4">
                <select
                  value={selectedActivityId || ''}
                  onChange={(e) => setSelectedActivityId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full max-w-xs mx-auto block bg-gray-700 border-2 border-gray-500 rounded-lg px-4 py-2.5 text-base text-white text-center font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Activity --</option>
                  {activeActivities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.activity_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                          className={`px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-150 disabled:opacity-50 active:scale-95 ${
                            savingObservation ? 'opacity-70 cursor-wait' : ''
                          } ${
                            outcome.outcome_name === 'Complete'
                              ? 'bg-green-600 hover:bg-green-500 active:bg-green-700'
                              : outcome.outcome_name === 'Transferred'
                              ? 'bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700'
                              : outcome.outcome_name === 'Pended'
                              ? 'bg-orange-600 hover:bg-orange-500 active:bg-orange-700'
                              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
                          }`}
                        >
                          {savingObservation ? '...' : outcome.outcome_name}
                        </button>
                      ))}
                    </div>

                    {/* Inline Flag Toggles */}
                    {flags.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mb-3">
                        {flags.map((flag) => {
                          const isActive = activeFlags.includes(flag.id);
                          return (
                            <button
                              key={flag.id}
                              onClick={() => {
                                setActiveFlags(prev =>
                                  isActive
                                    ? prev.filter(id => id !== flag.id)
                                    : [...prev, flag.id]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
                    )}

                    {/* Quick Note & Opportunity Buttons */}
                    <div className="flex justify-center gap-3 mb-3">
                      <button
                        onClick={() => setShowNoteInput(!showNoteInput)}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          pendingNote
                            ? 'bg-gray-600 text-white'
                            : showNoteInput
                            ? 'bg-gray-700 text-gray-300'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {pendingNote ? '+ Note ●' : '+ Note'}
                      </button>
                      <button
                        onClick={() => setShowOpportunityInput(!showOpportunityInput)}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          pendingOpportunity
                            ? 'bg-purple-700 text-white'
                            : showOpportunityInput
                            ? 'bg-gray-700 text-gray-300'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {pendingOpportunity ? '! Opportunity ●' : '! Opportunity'}
                      </button>
                    </div>

                    {/* Note Input */}
                    {showNoteInput && (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={pendingNote}
                          onChange={(e) => setPendingNote(e.target.value)}
                          placeholder="Add note for this observation..."
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setShowNoteInput(false);
                            } else if (e.key === 'Escape') {
                              setPendingNote('');
                              setShowNoteInput(false);
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Opportunity Input */}
                    {showOpportunityInput && (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={pendingOpportunity}
                          onChange={(e) => setPendingOpportunity(e.target.value)}
                          placeholder="Improvement opportunity..."
                          className="w-full bg-gray-700 border border-purple-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setShowOpportunityInput(false);
                            } else if (e.key === 'Escape') {
                              setPendingOpportunity('');
                              setShowOpportunityInput(false);
                            }
                          }}
                        />
                      </div>
                    )}

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

            {/* Phases/Segments: Contact Center style with ACW */}
            {!isSimpleTimer && (
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
                    {/* Call/ACW Time Display */}
                    {isInACW && (
                      <div className="flex justify-center gap-4 mb-4 text-sm">
                        <div className="bg-gray-700 px-4 py-2 rounded-lg">
                          <span className="text-gray-400">Call: </span>
                          <span className="font-mono text-blue-400">{formatDuration(callDurationSeconds)}</span>
                        </div>
                        <div className="bg-gray-700 px-4 py-2 rounded-lg">
                          <span className="text-gray-400">ACW: </span>
                          <span className="font-mono text-orange-400">{formatDurationPrecise(elapsedSeconds - callDurationSeconds)}</span>
                        </div>
                      </div>
                    )}

                    {/* Activity selector for phases with multiple activities */}
                    {activeActivities.length > 1 && (
                      <div className="mb-3">
                        <select
                          value={selectedActivityId || ''}
                          onChange={(e) => setSelectedActivityId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                        >
                          <option value="">Select activity</option>
                          {activeActivities.map((activity) => (
                            <option key={activity.id} value={activity.id}>
                              {activity.activity_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Outcome buttons */}
                    <div className="flex flex-wrap gap-2 justify-center mb-3">
                      {outcomes.map((outcome) => (
                        <button
                          key={outcome.id}
                          onClick={() => handleQuickLog(outcome.id)}
                          disabled={savingObservation || (!selectedActivityId && activeActivities.length > 1)}
                          className={`px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-150 disabled:opacity-50 active:scale-95 ${
                            savingObservation ? 'opacity-70 cursor-wait' : ''
                          } ${
                            outcome.outcome_name === 'Complete'
                              ? 'bg-green-600 hover:bg-green-500 active:bg-green-700'
                              : outcome.outcome_name === 'Transferred'
                              ? 'bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700'
                              : outcome.outcome_name === 'Pended'
                              ? 'bg-orange-600 hover:bg-orange-500 active:bg-orange-700'
                              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
                          }`}
                        >
                          {savingObservation ? '...' : outcome.outcome_name}
                        </button>
                      ))}
                    </div>

                    {/* Add ACW Button - only show when not already in ACW */}
                    {!isInACW && (
                      <div className="mb-3">
                        <button
                          onClick={handleAddACW}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium transition-colors"
                        >
                          + Add ACW
                        </button>
                      </div>
                    )}

                    {/* Inline Flag Toggles */}
                    {flags.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mb-3">
                        {flags.map((flag) => {
                          const isActive = activeFlags.includes(flag.id);
                          return (
                            <button
                              key={flag.id}
                              onClick={() => {
                                setActiveFlags(prev =>
                                  isActive
                                    ? prev.filter(id => id !== flag.id)
                                    : [...prev, flag.id]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
                    )}

                    {/* Quick Note & Opportunity Buttons */}
                    <div className="flex justify-center gap-3 mb-3">
                      <button
                        onClick={() => setShowNoteInput(!showNoteInput)}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          pendingNote
                            ? 'bg-gray-600 text-white'
                            : showNoteInput
                            ? 'bg-gray-700 text-gray-300'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {pendingNote ? '+ Note ●' : '+ Note'}
                      </button>
                      <button
                        onClick={() => setShowOpportunityInput(!showOpportunityInput)}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          pendingOpportunity
                            ? 'bg-purple-700 text-white'
                            : showOpportunityInput
                            ? 'bg-gray-700 text-gray-300'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {pendingOpportunity ? '! Opportunity ●' : '! Opportunity'}
                      </button>
                    </div>

                    {/* Note Input */}
                    {showNoteInput && (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={pendingNote}
                          onChange={(e) => setPendingNote(e.target.value)}
                          placeholder="Add note for this observation..."
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setShowNoteInput(false);
                            } else if (e.key === 'Escape') {
                              setPendingNote('');
                              setShowNoteInput(false);
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Opportunity Input */}
                    {showOpportunityInput && (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={pendingOpportunity}
                          onChange={(e) => setPendingOpportunity(e.target.value)}
                          placeholder="Improvement opportunity..."
                          className="w-full bg-gray-700 border border-purple-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setShowOpportunityInput(false);
                            } else if (e.key === 'Escape') {
                              setPendingOpportunity('');
                              setShowOpportunityInput(false);
                            }
                          }}
                        />
                      </div>
                    )}

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
                {/* Table Header - Different for Simple vs Phases */}
                {isSimpleTimer ? (
                  <div className="grid grid-cols-12 gap-1 px-3 py-2 text-xs text-gray-500 border-b border-gray-700 sticky top-0 bg-gray-900">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">Activity</div>
                    <div className="col-span-2">Duration</div>
                    <div className="col-span-2">Outcome</div>
                    <div className="col-span-4">Flags</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-1 px-3 py-2 text-xs text-gray-500 border-b border-gray-700 sticky top-0 bg-gray-900">
                    <div className="col-span-1">#</div>
                    <div className="col-span-2">Call</div>
                    <div className="col-span-2">ACW</div>
                    <div className="col-span-2">AHT</div>
                    <div className="col-span-2">Outcome</div>
                    <div className="col-span-3">Flags</div>
                  </div>
                )}

                {/* Observation Rows */}
                <div className="divide-y divide-gray-800">
                  {[...observations].reverse().map((obs) => (
                    <button
                      key={obs.id}
                      onClick={() => handleEditObservation(obs)}
                      className={`w-full grid grid-cols-12 gap-1 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left items-center`}
                    >
                      <div className="col-span-1 text-gray-500 text-sm font-mono">
                        {obs.observation_number}
                      </div>

                      {isSimpleTimer ? (
                        <>
                          {/* Simple Timer Row */}
                          <div className="col-span-3 text-xs text-gray-300 truncate flex items-center gap-1">
                            <span className="truncate">
                              {obs.activity_name || obs.adhoc_activity_name || '—'}
                            </span>
                            {(obs.notes || obs.opportunity) && (
                              <span className="text-gray-600 flex-shrink-0">✎</span>
                            )}
                          </div>
                          <div className="col-span-2 font-mono text-sm text-gray-300">
                            {formatDuration(obs.total_duration_seconds)}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Contact Center Row - Call/ACW/AHT */}
                          <div className="col-span-2 font-mono text-xs text-blue-400">
                            {formatDuration(obs.call_duration_seconds)}
                          </div>
                          <div className="col-span-2 font-mono text-xs text-orange-400">
                            {obs.acw_duration_seconds != null ? formatDuration(obs.acw_duration_seconds) : '—'}
                          </div>
                          <div className="col-span-2 font-mono text-xs text-gray-300 flex items-center gap-1">
                            {formatDuration(obs.total_duration_seconds)}
                            {(obs.notes || obs.opportunity) && (
                              <span className="text-gray-600 flex-shrink-0">✎</span>
                            )}
                          </div>
                        </>
                      )}

                      <div className="col-span-2">
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
                      <div className={`${isSimpleTimer ? 'col-span-4' : 'col-span-3'} text-xs text-gray-400 truncate`}>
                        {obs.flags && obs.flags.length > 0 ? (
                          <span className="text-blue-400">
                            {obs.flags.map(f => f.flag_name).join(', ')}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Footer with totals and averages */}
                <div className="border-t border-gray-700 px-3 py-2 text-xs text-gray-500 sticky bottom-0 bg-gray-900">
                  {isSimpleTimer ? (
                    <span>{totalObservations} observation{totalObservations !== 1 ? 's' : ''} · {formatDuration(totalDuration)} total</span>
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>{totalObservations} obs</span>
                      <span>Avg Call: <span className="text-blue-400 font-mono">{avgCallDuration != null ? formatDuration(avgCallDuration) : '--'}</span></span>
                      <span>Avg ACW: <span className="text-orange-400 font-mono">{avgACWDuration != null ? formatDuration(avgACWDuration) : '--'}</span></span>
                      <span>AHT: <span className="text-gray-300 font-mono">{avgAHT != null ? formatDuration(avgAHT) : '--'}</span></span>
                    </div>
                  )}
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
          flags={flags}
          elapsedSeconds={elapsedSeconds}
          initialActiveFlags={activeFlags}
          initialNote={pendingNote}
          initialOpportunity={pendingOpportunity}
          onSelectOutcome={handleEndSessionWithOutcome}
          onCancel={() => setShowEndSessionModal(false)}
          isSaving={savingObservation}
        />
      )}
    </div>
  );
}
