'use client';

import { useEffect, useState } from 'react';
import ProcessMap from '@/components/ProcessMap';
import { Activity, SwimlaneConfig, Workflow } from '@/lib/types';

export default function Home() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [swimlanes, setSwimlanes] = useState<SwimlaneConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch workflows on mount
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const res = await fetch('/api/activities');
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setWorkflows(data.workflows || []);

        // Auto-select first workflow
        if (data.workflows?.length > 0) {
          setSelectedWorkflowId(data.workflows[0].id);
        }
      } catch (err) {
        setError('Failed to fetch workflows');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflows();
  }, []);

  // Fetch activities when workflow changes
  useEffect(() => {
    if (!selectedWorkflowId) return;

    async function fetchActivities() {
      setLoading(true);
      try {
        const res = await fetch(`/api/activities?workflowId=${selectedWorkflowId}`);
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setActivities(data.activities || []);
        setSwimlanes(data.swimlanes || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch activities');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, [selectedWorkflowId]);

  if (loading && workflows.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && workflows.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Error</p>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">Process Map</h1>

          {/* Workflow selector */}
          <select
            value={selectedWorkflowId || ''}
            onChange={(e) => setSelectedWorkflowId(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.workflow_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{activities.length} activities</span>
          {loading && <span className="text-blue-600">Loading...</span>}
        </div>
      </header>

      {/* Map */}
      <main className="flex-1 relative">
        {activities.length > 0 ? (
          <ProcessMap activities={activities} swimlanes={swimlanes} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {loading ? 'Loading activities...' : 'No activities in this workflow'}
          </div>
        )}
      </main>

      {/* Legend */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-6 text-xs text-gray-600">
        <span className="font-medium">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white"></div>
          <span>Not Started</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-100"></div>
          <span>Analyzing</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-yellow-500 bg-yellow-100"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-100"></div>
          <span>Transformed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-gray-400 bg-gray-100"></div>
          <span>Deferred</span>
        </div>
        <span className="ml-4 font-medium">Plan badges:</span>
        <div className="flex items-center gap-1">
          <span className="bg-red-500 text-white px-1 rounded text-[10px]">E</span>
          <span>Eliminate</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-purple-500 text-white px-1 rounded text-[10px]">A</span>
          <span>Automate</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-blue-500 text-white px-1 rounded text-[10px]">O</span>
          <span>Optimize</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-orange-500 text-white px-1 rounded text-[10px]">O</span>
          <span>Outsource</span>
        </div>
      </footer>
    </div>
  );
}
