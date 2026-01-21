'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Activity } from '@/lib/types';
import { useSettings } from '@/lib/SettingsContext';
import { useWorkflow } from '@/lib/WorkflowContext';

type SortColumn = 'id' | 'name' | 'type' | 'swimlane' | 'phase' | 'status' | 'plan' | 'monthly_cost' | 'annual_cost';
type SortDirection = 'asc' | 'desc';

export default function ActivitiesPage() {
  const { settings, workHoursPerMonth } = useSettings();
  const { workflows, selectedWorkflowId, selectWorkflow, swimlanes, loading: workflowLoading } = useWorkflow();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

  // Get swimlane name for display
  const getSwimlaneName = (gridLocation: string | null) => {
    if (!gridLocation) return '-';
    const letter = gridLocation.match(/^[A-Z]/)?.[0];
    if (!letter) return '-';
    const swimlane = swimlanes.find((s) => s.swimlane_letter === letter);
    return swimlane ? `${letter} - ${swimlane.swimlane_name}` : letter;
  };

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort activities
  const sortedActivities = useMemo(() => {
    const sorted = [...activities].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortColumn) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'name':
          aVal = a.activity_name?.toLowerCase() || '';
          bVal = b.activity_name?.toLowerCase() || '';
          break;
        case 'type':
          aVal = a.activity_type;
          bVal = b.activity_type;
          break;
        case 'swimlane':
          aVal = a.grid_location?.match(/^[A-Z]/)?.[0] || 'ZZZ';
          bVal = b.grid_location?.match(/^[A-Z]/)?.[0] || 'ZZZ';
          break;
        case 'phase':
          aVal = parseInt(a.grid_location?.match(/\d+/)?.[0] || '9999', 10);
          bVal = parseInt(b.grid_location?.match(/\d+/)?.[0] || '9999', 10);
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'plan':
          aVal = a.transformation_plan || 'zzz';
          bVal = b.transformation_plan || 'zzz';
          break;
        case 'monthly_cost':
          const aCosts = calculateCosts(a);
          const bCosts = calculateCosts(b);
          aVal = aCosts?.monthly_cost ?? -1;
          bVal = bCosts?.monthly_cost ?? -1;
          break;
        case 'annual_cost':
          const aAnnual = calculateCosts(a);
          const bAnnual = calculateCosts(b);
          aVal = aAnnual?.annual_cost ?? -1;
          bVal = bAnnual?.annual_cost ?? -1;
          break;
      }

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [activities, sortColumn, sortDirection, settings.productivity_factor]);

  // Sortable column header component
  const SortableHeader = ({ column, label, align = 'left' }: { column: SortColumn; label: string; align?: 'left' | 'right' | 'center' }) => (
    <th
      onClick={() => handleSort(column)}
      className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      }`}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {label}
        {sortColumn === column && (
          <span className="link-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">Activities</h1>

          {/* Workflow selector */}
          <div className="flex items-center gap-2">
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
            <Link href="/workflows" className="text-sm link-primary">
              Manage Workflows
            </Link>
          </div>
        </div>

        {selectedWorkflowId && (
          <Link
            href={`/activities/new?workflowId=${selectedWorkflowId}`}
            className="btn-primary px-4 py-2 rounded-md text-sm  transition-colors"
          >
            + New Activity
          </Link>
        )}
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {workflowLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading...</p>
          </div>
        ) : !selectedWorkflowId ? (
          <div className="text-center py-12 text-gray-500">
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
              className="inline-block mt-4 btn-primary px-4 py-2 rounded-md text-sm "
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
                    <SortableHeader column="id" label="ID" />
                    <SortableHeader column="name" label="Name" />
                    <SortableHeader column="type" label="Type" />
                    <SortableHeader column="swimlane" label="Swimlane" />
                    <SortableHeader column="phase" label="Phase" />
                    <SortableHeader column="plan" label="Plan" />
                    <SortableHeader column="status" label="Status" />
                    <SortableHeader column="monthly_cost" label="Monthly Cost" align="right" />
                    <SortableHeader column="annual_cost" label="Annual Cost" align="right" />
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedActivities.map((activity) => {
                    const costs = calculateCosts(activity);
                    const stepNumber = activity.grid_location?.match(/\d+/)?.[0];
                    const isUnassigned = !stepNumber;

                    return (
                      <tr key={activity.id} className={`hover:bg-gray-50 ${isUnassigned ? 'bg-yellow-50' : ''}`}>
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
                          {getSwimlaneName(activity.grid_location)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {isUnassigned ? (
                            <span className="text-yellow-600 italic">Unassigned</span>
                          ) : (
                            stepNumber
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <PlanBadge plan={activity.transformation_plan} />
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
                            className="link-primary mr-3"
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
                    <td colSpan={7} className="px-4 py-3 text-sm font-bold text-gray-900">
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

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-gray-400">-</span>;

  const planStyles: Record<string, string> = {
    eliminate: 'bg-red-100 text-red-700',
    automate: 'bg-purple-100 text-purple-700',
    optimize: 'bg-blue-100 text-blue-700',
    outsource: 'bg-orange-100 text-orange-700',
    defer: 'bg-gray-100 text-gray-700',
  };

  const style = planStyles[plan] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${style}`}>
      {plan}
    </span>
  );
}
