'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  TimeStudy,
  TimeStudyActivity,
  TimeStudyFlag,
  TimeStudyOutcome,
} from '@/lib/time-study-types';

interface StudyData {
  study: TimeStudy;
  activities: TimeStudyActivity[];
  flags: TimeStudyFlag[];
  outcomes: TimeStudyOutcome[];
}

export default function StudySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const studyId = params.studyId as string;

  const [data, setData] = useState<StudyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit state
  const [studyName, setStudyName] = useState('');
  const [newActivityName, setNewActivityName] = useState('');
  const [newFlagName, setNewFlagName] = useState('');
  const [newOutcomeName, setNewOutcomeName] = useState('');

  // Load data
  const loadData = async () => {
    try {
      const res = await fetch(`/api/time-study/studies/${studyId}`);
      const studyData = await res.json();
      if (studyData.error) throw new Error(studyData.error);

      setData(studyData);
      setStudyName(studyData.study.study_name);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studyId]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Update study name
  const handleSaveStudyName = async () => {
    if (!studyName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ study_name: studyName.trim() }),
      });

      if (!res.ok) throw new Error('Failed to update study name');

      showSuccess('Study name updated');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  // Activities
  const handleAddActivity = async () => {
    if (!newActivityName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_name: newActivityName.trim(),
          is_adhoc: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to add activity');

      setNewActivityName('');
      showSuccess('Activity added');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add activity');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivity = async (activityId: number, currentlyActive: boolean) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}/activities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          is_active: !currentlyActive,
        }),
      });

      if (!res.ok) throw new Error('Failed to update activity');

      showSuccess(currentlyActive ? 'Activity deactivated' : 'Activity activated');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update activity');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (activityId: number) => {
    if (!confirm('Are you sure you want to delete this activity? This cannot be undone.')) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}/activities`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: activityId }),
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      showSuccess('Activity deleted');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity');
    } finally {
      setSaving(false);
    }
  };

  // Flags
  const handleAddFlag = async () => {
    if (!newFlagName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flag_name: newFlagName.trim(),
          is_standard: false,
        }),
      });

      if (!res.ok) throw new Error('Failed to add flag');

      setNewFlagName('');
      showSuccess('Flag added');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add flag');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFlag = async (flagId: number) => {
    if (!confirm('Are you sure you want to delete this flag? This cannot be undone.')) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}/flags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag_id: flagId }),
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      showSuccess('Flag deleted');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flag');
    } finally {
      setSaving(false);
    }
  };

  // Outcomes
  const handleAddOutcome = async () => {
    if (!newOutcomeName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}/outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome_name: newOutcomeName.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to add outcome');

      setNewOutcomeName('');
      showSuccess('Outcome added');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add outcome');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOutcome = async (outcomeId: number) => {
    if (!confirm('Are you sure you want to delete this outcome? This cannot be undone.')) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}/outcomes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome_id: outcomeId }),
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      showSuccess('Outcome deleted');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete outcome');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading settings...</p>
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

  const { study, activities, flags, outcomes } = data;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/time-study" className="hover:text-gray-700">
            Time Studies
          </Link>
          <span>/</span>
          <Link href={`/time-study/${studyId}/summary`} className="hover:text-gray-700">
            {study.study_name}
          </Link>
          <span>/</span>
          <span className="text-gray-700">Settings</span>
        </div>
        <h1 className="text-xl font-bold text-gray-800">Study Settings</h1>
      </header>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-green-700 text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Study Name */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Study Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Study Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={studyName}
                    onChange={(e) => setStudyName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleSaveStudyName}
                    disabled={saving || studyName === study.study_name}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Structure Type</label>
                <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                  {study.structure_type === 'simple' && 'Simple Timer'}
                  {study.structure_type === 'phases' && 'Phases (Contact Center)'}
                  {study.structure_type === 'segments' && 'Segments'}
                  <span className="text-gray-500 ml-2">(cannot be changed)</span>
                </p>
              </div>

              {study.workflow_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Linked Workflow</label>
                  <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                    {study.workflow_name}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Activities */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Activities</h2>

            <div className="space-y-3 mb-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    activity.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${activity.is_active ? 'text-gray-800' : 'text-gray-500 line-through'}`}>
                      {activity.activity_name}
                    </span>
                    {activity.is_adhoc && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">ad-hoc</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActivity(activity.id, activity.is_active)}
                      disabled={saving}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {activity.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteActivity(activity.id)}
                      disabled={saving}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder="New activity name..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
              />
              <button
                onClick={handleAddActivity}
                disabled={saving || !newActivityName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </section>

          {/* Flags */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Flags</h2>

            <div className="flex flex-wrap gap-2 mb-4">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full"
                >
                  <span className="text-sm text-blue-800">{flag.flag_name}</span>
                  {flag.is_standard && (
                    <span className="text-xs text-blue-500">(std)</span>
                  )}
                  <button
                    onClick={() => handleDeleteFlag(flag.id)}
                    disabled={saving}
                    className="text-blue-400 hover:text-red-600 disabled:opacity-50"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newFlagName}
                onChange={(e) => setNewFlagName(e.target.value)}
                placeholder="New flag name..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddFlag()}
              />
              <button
                onClick={handleAddFlag}
                disabled={saving || !newFlagName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </section>

          {/* Outcomes */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Outcomes</h2>
            <p className="text-sm text-gray-500 mb-4">
              Warning: Deleting an outcome that has been used in observations will fail.
              Only outcomes with no observations can be deleted.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {outcomes.map((outcome) => (
                <div
                  key={outcome.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                    outcome.outcome_name === 'Complete'
                      ? 'bg-green-50 border-green-200'
                      : outcome.outcome_name === 'Transferred'
                      ? 'bg-yellow-50 border-yellow-200'
                      : outcome.outcome_name === 'Pended'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className={`text-sm ${
                    outcome.outcome_name === 'Complete'
                      ? 'text-green-800'
                      : outcome.outcome_name === 'Transferred'
                      ? 'text-yellow-800'
                      : outcome.outcome_name === 'Pended'
                      ? 'text-orange-800'
                      : 'text-gray-800'
                  }`}>
                    {outcome.outcome_name}
                  </span>
                  <button
                    onClick={() => handleDeleteOutcome(outcome.id)}
                    disabled={saving}
                    className="text-gray-500 hover:text-red-600 disabled:opacity-50"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newOutcomeName}
                onChange={(e) => setNewOutcomeName(e.target.value)}
                placeholder="New outcome name..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddOutcome()}
              />
              <button
                onClick={handleAddOutcome}
                disabled={saving || !newOutcomeName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </section>

          {/* Back Button */}
          <div className="flex justify-between">
            <Link
              href={`/time-study/${studyId}/summary`}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Back to Summary
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
