'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { TimeStudy, TimeStudyActivity, TimeStudyStep } from '@/lib/time-study-types';

interface StudyData {
  study: TimeStudy;
  activities: TimeStudyActivity[];
  steps: TimeStudyStep[];
}

export default function NewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params.studyId as string;

  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [observerName, setObserverName] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [sessionDate, setSessionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch(`/api/time-study/studies/${studyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setStudyData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load study');
        setLoading(false);
        console.error(err);
      });
  }, [studyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!observerName.trim()) {
      setError('Observer name is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      const res = await fetch(`/api/time-study/studies/${studyId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observer_name: observerName.trim(),
          observed_worker_name: workerName.trim() || null,
          session_date: sessionDate,
          started_at: now,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to observation screen
      router.push(`/time-study/${studyId}/session/${data.id}/observe`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
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
          <p className="mt-4 text-gray-500">Loading study...</p>
        </div>
      </div>
    );
  }

  if (!studyData) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">{error || 'Study not found'}</p>
          <Link href="/time-study" className="text-blue-600 hover:underline mt-4 block">
            Back to Studies
          </Link>
        </div>
      </div>
    );
  }

  const { study, activities, steps } = studyData;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/time-study" className="hover:text-gray-700">
            Time Studies
          </Link>
          <span>/</span>
          <span className="text-gray-700">{study.study_name}</span>
          <span>/</span>
          <span className="text-gray-700">New Session</span>
        </div>
        <h1 className="text-xl font-bold text-gray-800">Start Observation Session</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Study Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900">{study.study_name}</h2>
            <div className="mt-2 text-sm text-blue-800 space-y-1">
              {study.workflow_name && (
                <p>
                  <span className="text-blue-600">Workflow:</span> {study.workflow_name}
                </p>
              )}
              <p>
                <span className="text-blue-600">Template:</span> {study.template_name || 'None'}
              </p>
              <p>
                <span className="text-blue-600">Structure:</span>{' '}
                <span className="capitalize">{study.structure_type}</span>
              </p>
              <p>
                <span className="text-blue-600">Activities:</span> {activities.length}
              </p>
              {steps.length > 0 && (
                <p>
                  <span className="text-blue-600">Steps:</span> {steps.length}
                </p>
              )}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                Dismiss
              </button>
            </div>
          )}

          {/* Session Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Details</h3>

            <div className="space-y-4">
              {/* Observer Name */}
              <div>
                <label htmlFor="observerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Observer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="observerName"
                  value={observerName}
                  onChange={(e) => setObserverName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">The person conducting the observation</p>
              </div>

              {/* Worker Name */}
              <div>
                <label htmlFor="workerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Observed Worker Name
                </label>
                <input
                  type="text"
                  id="workerName"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="Worker being observed (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">The person being timed (optional)</p>
              </div>

              {/* Session Date */}
              <div>
                <label htmlFor="sessionDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Session Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="sessionDate"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Session Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this session (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="mt-6 flex items-center justify-between">
              <Link
                href="/time-study"
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={creating || !observerName.trim()}
                className="btn-primary px-6 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Start Session
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Tips */}
          <div className="mt-6 bg-gray-100 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 text-sm mb-2">Before you start:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>
                - Make sure you have the observer&apos;s permission to time their work
              </li>
              <li>- Have the activity list and timing structure reviewed</li>
              <li>
                - The session will begin immediately after clicking &quot;Start Session&quot;
              </li>
              <li>- You can add observations and stop the session at any time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
