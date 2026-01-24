'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type {
  TimeStudy,
  TimeStudySummary,
  TimeStudyActivitySummary,
  TimeStudyStepSummary,
  TimeStudySession,
} from '@/lib/time-study-types';
import { formatDuration } from '@/lib/time-study-types';

interface ContactCenterStats {
  avg_call_duration_seconds: number | null;
  median_call_duration_seconds: number | null;
  min_call_duration_seconds: number | null;
  max_call_duration_seconds: number | null;
  avg_acw_duration_seconds: number | null;
  median_acw_duration_seconds: number | null;
  min_acw_duration_seconds: number | null;
  max_acw_duration_seconds: number | null;
  observations_with_acw: number;
  avg_aht_seconds: number | null;
}

interface SummaryData {
  study: TimeStudy;
  summary: TimeStudySummary | null;
  activitySummary: TimeStudyActivitySummary[];
  stepSummary: TimeStudyStepSummary[];
  sessions: TimeStudySession[];
  contactCenterStats: ContactCenterStats | null;
}

export default function StudySummaryPage() {
  const params = useParams();
  const studyId = params.studyId as string;

  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'steps' | 'sessions' | 'data'>(
    'overview'
  );

  useEffect(() => {
    console.log('[Summary Page] Fetching data for study:', studyId);
    Promise.all([
      fetch(`/api/time-study/studies/${studyId}`).then((r) => r.json()),
      fetch(`/api/time-study/studies/${studyId}/summary`).then((r) => r.json()),
      fetch(`/api/time-study/studies/${studyId}/sessions`).then((r) => r.json()),
    ])
      .then(([studyData, summaryData, sessionsData]) => {
        console.log('[Summary Page] studyData:', studyData);
        console.log('[Summary Page] summaryData:', summaryData);
        console.log('[Summary Page] summaryData.summary:', summaryData.summary);
        console.log('[Summary Page] summaryData.activitySummary:', summaryData.activitySummary);
        console.log('[Summary Page] sessionsData:', sessionsData);

        if (studyData.error) throw new Error(studyData.error);

        setData({
          study: studyData.study,
          summary: summaryData.summary || null,
          activitySummary: summaryData.activitySummary || [],
          stepSummary: summaryData.stepSummary || [],
          sessions: sessionsData.sessions || [],
          contactCenterStats: summaryData.contactCenterStats || null,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('[Summary Page] Error:', err);
        setError(err.message || 'Failed to load data');
        setLoading(false);
      });
  }, [studyId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (!data) {
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

  const { study, summary, activitySummary, stepSummary, sessions } = data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Active</span>;
      case 'completed':
        return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Completed</span>;
      case 'archived':
        return <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">Archived</span>;
      default:
        return null;
    }
  };

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
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">{study.study_name}</h1>
            {getStatusBadge(study.status)}
            <Link
              href={`/time-study/${studyId}/settings`}
              className="text-gray-500 hover:text-gray-600"
              title="Study Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {study.status === 'active' && (
              <Link
                href={`/time-study/${studyId}/session/new`}
                className="btn-primary px-4 py-2 rounded-md text-sm"
              >
                Start New Session
              </Link>
            )}
          </div>
        </div>
        {study.workflow_name && (
          <p className="text-sm text-gray-500 mt-1">Workflow: {study.workflow_name}</p>
        )}
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-6">
          {['overview', 'activities', 'steps', 'sessions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`py-3 border-b-2 text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
          <Link
            href={`/time-study/${studyId}/data`}
            className="py-3 border-b-2 text-sm font-medium transition-colors border-transparent text-gray-500 hover:text-gray-700"
          >
            Data Grid
          </Link>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && (
            <OverviewTab study={study} summary={summary} contactCenterStats={data.contactCenterStats} />
          )}
          {activeTab === 'activities' && (
            <ActivitiesTab activitySummary={activitySummary} />
          )}
          {activeTab === 'steps' && (
            <StepsTab study={study} stepSummary={stepSummary} />
          )}
          {activeTab === 'sessions' && (
            <SessionsTab studyId={studyId} sessions={sessions} />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  study,
  summary,
  contactCenterStats,
}: {
  study: TimeStudy;
  summary: TimeStudySummary | null;
  contactCenterStats: ContactCenterStats | null;
}) {
  const isContactCenter = study.structure_type === 'phases';

  if (!summary) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No observations recorded yet.</p>
        <p className="text-sm mt-2">Start a session to begin collecting data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Sessions</p>
          <p className="text-2xl font-bold text-gray-900">{summary.session_count}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Observers</p>
          <p className="text-2xl font-bold text-gray-900">{summary.observer_count}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Observations</p>
          <p className="text-2xl font-bold text-gray-900">{summary.observation_count}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">{isContactCenter ? 'Avg AHT' : 'Avg Duration'}</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatDuration(summary.avg_duration_seconds)}
          </p>
        </div>
      </div>

      {/* Contact Center Metrics */}
      {isContactCenter && contactCenterStats && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Center Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Avg Call Time</p>
              <p className="text-xl font-bold text-blue-600">
                {formatDuration(contactCenterStats.avg_call_duration_seconds)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Med: {formatDuration(contactCenterStats.median_call_duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg ACW</p>
              <p className="text-xl font-bold text-orange-600">
                {formatDuration(contactCenterStats.avg_acw_duration_seconds)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Med: {formatDuration(contactCenterStats.median_acw_duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg AHT</p>
              <p className="text-xl font-bold text-gray-900">
                {formatDuration(contactCenterStats.avg_aht_seconds)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                (Call + ACW)
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ACW Rate</p>
              <p className="text-xl font-bold text-gray-900">
                {summary.observation_count > 0
                  ? Math.round((contactCenterStats.observations_with_acw / summary.observation_count) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {contactCenterStats.observations_with_acw} of {summary.observation_count}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Duration Stats - Only show for non-contact center studies */}
      {!isContactCenter && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Duration Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-500">Average</p>
              <p className="text-lg font-medium">{formatDuration(summary.avg_duration_seconds)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Median</p>
              <p className="text-lg font-medium">{formatDuration(summary.median_duration_seconds)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Minimum</p>
              <p className="text-lg font-medium">{formatDuration(summary.min_duration_seconds)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Maximum</p>
              <p className="text-lg font-medium">{formatDuration(summary.max_duration_seconds)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Std Dev</p>
              <p className="text-lg font-medium">{formatDuration(summary.stddev_duration_seconds)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Call Time Range for Contact Center */}
      {isContactCenter && contactCenterStats && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Call Time Range</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Min Call</p>
              <p className="text-lg font-medium font-mono text-blue-600">
                {formatDuration(contactCenterStats.min_call_duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Max Call</p>
              <p className="text-lg font-medium font-mono text-blue-600">
                {formatDuration(contactCenterStats.max_call_duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Min ACW</p>
              <p className="text-lg font-medium font-mono text-orange-600">
                {formatDuration(contactCenterStats.min_acw_duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Max ACW</p>
              <p className="text-lg font-medium font-mono text-orange-600">
                {formatDuration(contactCenterStats.max_acw_duration_seconds)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Date Range */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Study Period</h3>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-sm text-gray-500">First Session</p>
            <p className="text-lg font-medium">
              {summary.first_session_date
                ? new Date(summary.first_session_date).toLocaleDateString()
                : '--'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Session</p>
            <p className="text-lg font-medium">
              {summary.last_session_date
                ? new Date(summary.last_session_date).toLocaleDateString()
                : '--'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivitiesTab({ activitySummary }: { activitySummary: TimeStudyActivitySummary[] }) {
  if (activitySummary.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No activity data available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Activity
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Count
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Avg
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Median
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Min
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Max
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Complete
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Transfer
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Pend
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {activitySummary.map((activity, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 text-sm text-gray-900">
                {activity.activity_name}
                {activity.is_adhoc && (
                  <span className="ml-2 text-xs text-gray-500">(ad-hoc)</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-center text-gray-600">
                {activity.observation_count}
              </td>
              <td className="px-4 py-3 text-sm text-center font-mono">
                {formatDuration(activity.avg_duration_seconds)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-mono">
                {formatDuration(activity.median_duration_seconds)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-mono">
                {formatDuration(activity.min_duration_seconds)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-mono">
                {formatDuration(activity.max_duration_seconds)}
              </td>
              <td className="px-4 py-3 text-sm text-center text-green-600">
                {activity.complete_count}
              </td>
              <td className="px-4 py-3 text-sm text-center text-yellow-600">
                {activity.transferred_count}
              </td>
              <td className="px-4 py-3 text-sm text-center text-orange-600">
                {activity.pended_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepsTab({
  study,
  stepSummary,
}: {
  study: TimeStudy;
  stepSummary: TimeStudyStepSummary[];
}) {
  if (study.structure_type === 'simple') {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>This study uses simple timing (no steps).</p>
      </div>
    );
  }

  if (stepSummary.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No step data available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Step
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Used In
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Total Visits
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Avg Visits
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Avg Duration
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Median
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Min
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Max
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {stepSummary.map((step, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 text-sm text-gray-900">{step.step_name}</td>
              <td className="px-4 py-3 text-sm text-center text-gray-600">
                {step.observations_with_step}
              </td>
              <td className="px-4 py-3 text-sm text-center text-gray-600">{step.total_visits}</td>
              <td className="px-4 py-3 text-sm text-center text-gray-600">
                {step.avg_visits_per_observation?.toFixed(1) || '--'}
              </td>
              <td className="px-4 py-3 text-sm text-center font-mono">
                {formatDuration(step.avg_duration_seconds)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-mono">
                {formatDuration(step.median_duration_seconds)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-mono">
                {formatDuration(step.min_duration_seconds)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-mono">
                {formatDuration(step.max_duration_seconds)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionsTab({ studyId, sessions }: { studyId: string; sessions: TimeStudySession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No sessions recorded yet.</p>
        <Link
          href={`/time-study/${studyId}/session/new`}
          className="text-blue-600 hover:underline mt-2 block"
        >
          Start first session
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="bg-white rounded-lg p-4 border border-gray-200"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{session.observer_name}</span>
                {session.observed_worker_name && (
                  <span className="text-gray-500">observing {session.observed_worker_name}</span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    session.status === 'completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {session.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(session.session_date).toLocaleDateString()} at{' '}
                {new Date(session.started_at).toLocaleTimeString()}
              </p>
              {session.notes && (
                <p className="text-sm text-gray-600 mt-2">{session.notes}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-mono">{formatDuration(session.total_duration_seconds ?? null)}</p>
              <p className="text-sm text-gray-500">{session.observation_count || 0} observations</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
