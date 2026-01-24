'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TimeStudy } from '@/lib/time-study-types';
import { formatDuration } from '@/lib/time-study-types';

export default function TimeStudyListPage() {
  const [studies, setStudies] = useState<TimeStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudies();
  }, []);

  const fetchStudies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/time-study/studies');
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setStudies(data.studies || []);
    } catch (err) {
      setError('Failed to load studies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studyId: number, studyName: string) => {
    if (!confirm(`Are you sure you want to delete "${studyName}"? All sessions and observations will be permanently deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/time-study/studies/${studyId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      await fetchStudies();
    } catch (err) {
      setError('Failed to delete study');
      console.error(err);
    }
  };

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

  const getStructureTypeBadge = (structureType: string) => {
    switch (structureType) {
      case 'simple':
        return <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded">Simple</span>;
      case 'phases':
        return <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">Phases</span>;
      case 'segments':
        return <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded">Segments</span>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Time Studies</h1>
          <p className="text-sm text-gray-500 mt-1">Conduct time and motion studies on workflow activities</p>
        </div>
        <Link
          href="/time-study/new"
          className="btn-primary px-4 py-2 rounded-md text-sm transition-colors"
        >
          + New Study
        </Link>
      </header>

      {/* Error display */}
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
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading studies...</p>
          </div>
        ) : studies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg">No time studies yet.</p>
            <p className="mt-2">Create a study to start timing workflow activities.</p>
            <Link
              href="/time-study/new"
              className="inline-block mt-4 btn-primary px-4 py-2 rounded-md text-sm"
            >
              Create First Study
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 max-w-5xl">
            {studies.map((study) => (
              <div
                key={study.id}
                className="bg-white rounded-lg shadow p-5 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/time-study/${study.id}/summary`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {study.study_name}
                      </Link>
                      {getStatusBadge(study.status)}
                      {getStructureTypeBadge(study.structure_type)}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      {study.workflow_name && (
                        <span>
                          <span className="text-gray-500">Workflow:</span> {study.workflow_name}
                        </span>
                      )}
                      {study.template_name && (
                        <span>
                          <span className="text-gray-500">Template:</span> {study.template_name}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Sessions:</span>{' '}
                        <span className="font-medium text-gray-700">{study.session_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Observations:</span>{' '}
                        <span className="font-medium text-gray-700">{study.observation_count || 0}</span>
                      </div>
                    </div>

                    <p className="text-gray-500 text-xs mt-3">
                      Created: {study.created_at ? new Date(study.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {study.status === 'active' && (
                      <Link
                        href={`/time-study/${study.id}/session/new`}
                        className="btn-primary px-3 py-1.5 rounded text-sm"
                      >
                        Start Session
                      </Link>
                    )}
                    <Link
                      href={`/time-study/${study.id}/summary`}
                      className="text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-100"
                    >
                      View Summary
                    </Link>
                    <Link
                      href={`/time-study/${study.id}/settings`}
                      className="text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-100"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(study.id, study.study_name)}
                      className="text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
