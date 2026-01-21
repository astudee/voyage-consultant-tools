'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Workflow } from '@/lib/types';
import { useSettings } from '@/lib/SettingsContext';

export default function ActivitiesPage() {
  const { settings, workHoursPerMonth } = useSettings();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewWorkflowForm, setShowNewWorkflowForm] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);

  // Calculate costs using dynamic settings
  const calculateCosts = (activity: Activity) => {
    let taskTime: number | null = null;
    if (activity.task_time_size === 'Other' && activity.task_time_custom) {
      taskTime = activity.task_time_custom;
    } else if (activity.task_time_midpoint) {
      taskTime = activity.task_time_midpoint;
    }

    let laborRate: number | null = null;
    if (activity.labor_rate_size === 'Other' && activity.labor_rate_custom) {
      laborRate = activity.labor_rate_custom;
    } else if (activity.labor_rate_midpoint) {
      laborRate = activity.labor_rate_midpoint;
    }

    let volume: number | null = null;
    if (activity.volume_size === 'Other' && activity.volume_custom) {
      volume = activity.volume_custom;
    } else if (activity.volume_midpoint) {
      volume = activity.volume_midpoint;
    }

    if (taskTime && laborRate && volume && taskTime > 0) {
      const effectiveTaskTime = taskTime / settings.productivity_factor;
      const tasksPerHour = 60 / effectiveTaskTime;
      const costPerTask = laborRate / tasksPerHour;
      const monthlyCost = costPerTask * volume;
      const annualCost = monthlyCost * 12;

      return {
        monthly_cost: monthlyCost,
        annual_cost: annualCost,
      };
    }

    return null;
  };

  // Fetch workflows on mount
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const res = await fetch('/api/workflows');
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setWorkflows(data.workflows || []);

        // Auto-select first workflow
        if (data.workflows?.length > 0 && !selectedWorkflowId) {
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
  }, [selectedWorkflowId]);

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

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return;

    setCreatingWorkflow(true);
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkflowName.trim(),
          description: newWorkflowDescription.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Refresh workflows and select the new one
      const workflowsRes = await fetch('/api/workflows');
      const workflowsData = await workflowsRes.json();
      setWorkflows(workflowsData.workflows || []);
      setSelectedWorkflowId(data.id);
      setShowNewWorkflowForm(false);
      setNewWorkflowName('');
      setNewWorkflowDescription('');
    } catch (err) {
      setError('Failed to create workflow');
      console.error(err);
    } finally {
      setCreatingWorkflow(false);
    }
  };

  const handleDeleteActivity = async (activityId: number) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Refresh activities
      setActivities(activities.filter((a) => a.id !== activityId));
    } catch (err) {
      setError('Failed to delete activity');
      console.error(err);
    }
  };

  // Calculate totals
  let totalMonthly = 0;
  let totalAnnual = 0;
  activities.forEach((activity) => {
    const costs = calculateCosts(activity);
    if (costs) {
      totalMonthly += costs.monthly_cost;
      totalAnnual += costs.annual_cost;
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">Activities</h1>

          {/* Workflow selector */}
          {!showNewWorkflowForm && (
            <div className="flex items-center gap-2">
              <select
                value={selectedWorkflowId || ''}
                onChange={(e) => setSelectedWorkflowId(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Workflow --</option>
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wf.workflow_name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewWorkflowForm(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + New Workflow
              </button>
            </div>
          )}
        </div>

        {selectedWorkflowId && !showNewWorkflowForm && (
          <Link
            href={`/activities/new?workflowId=${selectedWorkflowId}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            + New Activity
          </Link>
        )}
      </header>

      {/* New Workflow Form */}
      {showNewWorkflowForm && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Create New Workflow</h2>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name *
              </label>
              <input
                type="text"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Claims Processing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description"
              />
            </div>
            <button
              onClick={handleCreateWorkflow}
              disabled={creatingWorkflow || !newWorkflowName.trim()}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {creatingWorkflow ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowNewWorkflowForm(false);
                setNewWorkflowName('');
                setNewWorkflowDescription('');
              }}
              className="text-gray-600 px-4 py-1.5 rounded-md text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!selectedWorkflowId ? (
          <div className="text-center py-12 text-gray-500">
            {workflows.length === 0 ? (
              <>
                <p className="text-lg">No workflows yet.</p>
                <p className="mt-2">Create a workflow to get started.</p>
                <button
                  onClick={() => setShowNewWorkflowForm(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  Create First Workflow
                </button>
              </>
            ) : (
              <p>Select a workflow to view activities.</p>
            )}
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No activities in this workflow yet.</p>
            <Link
              href={`/activities/new?workflowId=${selectedWorkflowId}`}
              className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              Create First Activity
            </Link>
          </div>
        ) : (
          <>
            {/* Activities Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grid
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monthly Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Annual Cost
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activities.map((activity) => {
                    const costs = calculateCosts(activity);

                    return (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {activity.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {activity.activity_name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {activity.activity_type}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {activity.grid_location || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <StatusBadge status={activity.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {costs ? formatCurrency(costs.monthly_cost) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {costs ? formatCurrency(costs.annual_cost) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <Link
                            href={`/activities/${activity.id}`}
                            className="text-blue-600 hover:text-blue-700 mr-3"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-900">
                      TOTAL
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(totalMonthly)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(totalAnnual)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cost assumptions */}
            <p className="mt-4 text-xs text-gray-500">
              * Assumes {(settings.productivity_factor * 100).toFixed(0)}% productivity factor,{' '}
              {settings.hours_per_year.toLocaleString()} hrs/year - {settings.training_hours_per_year}{' '}
              training = {workHoursPerMonth.toFixed(0)} hrs/month capacity
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-700',
    analyzing: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    transformed: 'bg-green-100 text-green-700',
    deferred: 'bg-gray-200 text-gray-600',
  };

  const style = statusStyles[status] || statusStyles.not_started;

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {status?.replace('_', ' ') || 'not started'}
    </span>
  );
}
