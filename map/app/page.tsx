'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ProcessMap from '@/components/ProcessMap';
import ExportMenu from '@/components/ExportMenu';
import { Activity } from '@/lib/types';
import { useWorkflow } from '@/lib/WorkflowContext';

export type DisplayMode = 'grid' | 'cost' | 'time' | 'rate' | 'phase';

const displayModeOptions: { value: DisplayMode; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'cost', label: 'Annual Cost' },
  { value: 'time', label: 'Task Time' },
  { value: 'rate', label: 'Hourly Rate' },
  { value: 'phase', label: 'Phase' },
];

export default function Home() {
  const {
    workflows,
    selectedWorkflowId,
    selectWorkflow,
    selectedWorkflow,
    swimlanes,
    loading: workflowLoading
  } = useWorkflow();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Fetch activities when workflow changes
  useEffect(() => {
    if (!selectedWorkflowId) {
      setActivities([]);
      return;
    }

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

  // Separate assigned vs unassigned activities
  const assignedActivities = activities.filter((a) => {
    const hasStep = a.grid_location && /\d+/.test(a.grid_location);
    return hasStep;
  });

  const unassignedActivities = activities.filter((a) => {
    const hasStep = a.grid_location && /\d+/.test(a.grid_location);
    return !hasStep;
  });

  // Handle position update from drag-drop
  const handlePositionUpdate = async (activityId: number, newGridLocation: string) => {
    try {
      const res = await fetch(`/api/activities/${activityId}/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid_location: newGridLocation }),
      });
      const data = await res.json();

      if (data.error) {
        console.error('Failed to update position:', data.error);
        return;
      }

      // Refresh activities
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId ? { ...a, grid_location: newGridLocation } : a
        )
      );
    } catch (err) {
      console.error('Failed to update position:', err);
    }
  };

  if (workflowLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!selectedWorkflowId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center text-gray-500">
          {workflows.length === 0 ? (
            <>
              <p className="text-lg">No workflows yet.</p>
              <p className="mt-2">Create a workflow to get started.</p>
              <Link
                href="/workflows"
                className="mt-4 inline-block btn-primary px-4 py-2 rounded-md text-sm "
              >
                Create First Workflow
              </Link>
            </>
          ) : (
            <p>Select a workflow to view the process map.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">Process Transformation</h1>

          {/* Workflow selector */}
          <select
            value={selectedWorkflowId || ''}
            onChange={(e) => selectWorkflow(Number(e.target.value) || null)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Workflow --</option>
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.workflow_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          {/* Display mode selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
            {displayModeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDisplayMode(option.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  displayMode === option.value
                    ? 'bg-white shadow text-gray-800 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{assignedActivities.length} on map</span>
            {unassignedActivities.length > 0 && (
              <span className="text-yellow-600">{unassignedActivities.length} unassigned</span>
            )}
            {loading && <span className="link-primary">Loading...</span>}
          </div>

          {/* Export button */}
          {assignedActivities.length > 0 && (
            <ExportMenu
              workflowName={selectedWorkflow?.workflow_name || 'Process Map'}
              mapContainerRef={mapContainerRef}
            />
          )}
        </div>
      </header>

      {/* Map + Unassigned Sidebar */}
      <main className="flex-1 flex overflow-hidden">
        {/* Unassigned Activities Sidebar */}
        {unassignedActivities.length > 0 && (
          <div className="w-64 bg-yellow-50 border-r border-yellow-200 flex flex-col">
            <div className="px-3 py-2 bg-yellow-100 border-b border-yellow-200">
              <h2 className="font-semibold text-yellow-800 text-sm">Unassigned Activities</h2>
              <p className="text-xs text-yellow-600 mt-0.5">
                Drag to the map or edit to assign a step position
              </p>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {unassignedActivities.map((activity) => (
                <div
                  key={activity.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('activity-id', String(activity.id));
                    e.dataTransfer.setData('activity-swimlane', activity.grid_location || '');
                  }}
                  className="bg-white border border-yellow-300 rounded-md p-2 text-sm cursor-grab hover:shadow-md transition-shadow"
                >
                  <div className="font-medium text-gray-800 truncate">
                    {activity.activity_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span className="capitalize">{activity.activity_type}</span>
                    <span className="text-yellow-600">
                      Swimlane {activity.grid_location || '?'}
                    </span>
                  </div>
                  <Link
                    href={`/activities/${activity.id}`}
                    className="text-xs link-primary mt-1 inline-block"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Process Transformation */}
        <div className="flex-1 relative" ref={mapContainerRef}>
          {error ? (
            <div className="flex items-center justify-center h-full text-red-600">
              {error}
            </div>
          ) : assignedActivities.length > 0 ? (
            <ProcessMap
              activities={assignedActivities}
              swimlanes={swimlanes}
              onPositionUpdate={handlePositionUpdate}
              displayMode={displayMode}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              {loading ? 'Loading activities...' : (
                unassignedActivities.length > 0
                  ? 'Assign step positions to activities to see them on the map'
                  : 'No activities in this workflow'
              )}
            </div>
          )}
        </div>
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
