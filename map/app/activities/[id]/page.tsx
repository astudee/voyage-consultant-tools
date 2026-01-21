'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ActivityForm from '@/components/ActivityForm';
import { Activity } from '@/lib/types';

export default function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/activities/${id}`);
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setActivity(data.activity);
      } catch (err) {
        setError('Failed to fetch activity');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setDeleting(false);
        return;
      }

      router.push('/activities');
    } catch (err) {
      setError('Failed to delete activity');
      console.error(err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-800">Edit Activity</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Activity not found'}</p>
            <Link href="/activities" className="link-primary">
              Go back to Activities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/activities" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">
            Edit Activity #{activity.id}
          </h1>
          <span className="text-sm text-gray-500">
            {activity.activity_name} ({activity.grid_location})
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <ActivityForm activity={activity} workflowId={activity.workflow_id} />

          {/* Delete Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
            {showDeleteConfirm ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 mb-4">
                  Are you sure you want to delete this activity? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-gray-600 px-4 py-2 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 border border-red-300 px-4 py-2 rounded-md hover:bg-red-50"
              >
                Delete Activity
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
