'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Activity } from '@/lib/types';
import { useSettings } from '@/lib/SettingsContext';
import { useWorkflow } from '@/lib/WorkflowContext';

export default function ResourceModelPage() {
  const {
    settings,
    hoursAvailablePerYear,
    hoursAvailablePerMonth,
  } = useSettings();
  const {
    workflows,
    selectedWorkflowId,
    selectWorkflow,
    selectedWorkflow,
    loading: workflowLoading,
  } = useWorkflow();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Get effective values for calculations
  const getEffectiveTaskTime = (activity: Activity): number | null => {
    if (activity.task_time_custom != null) {
      return activity.task_time_custom;
    }
    return activity.task_time_midpoint || null;
  };

  const getEffectiveVolume = (activity: Activity): number | null => {
    if (activity.volume_custom != null) {
      return activity.volume_custom;
    }
    return activity.volume_midpoint || null;
  };

  // Calculate activity time requirements
  const activityCalculations = useMemo(() => {
    return activities.map((activity) => {
      const taskTime = getEffectiveTaskTime(activity);
      const volume = getEffectiveVolume(activity);

      const monthlyMinutes = taskTime && volume ? taskTime * volume : null;
      const annualMinutes = monthlyMinutes ? monthlyMinutes * 12 : null;

      return {
        ...activity,
        taskTime,
        volume,
        monthlyMinutes,
        annualMinutes,
      };
    });
  }, [activities]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalMonthlyMinutes = 0;
    let totalAnnualMinutes = 0;

    activityCalculations.forEach((calc) => {
      if (calc.monthlyMinutes) totalMonthlyMinutes += calc.monthlyMinutes;
      if (calc.annualMinutes) totalAnnualMinutes += calc.annualMinutes;
    });

    const totalMonthlyHours = totalMonthlyMinutes / 60;
    const totalAnnualHours = totalAnnualMinutes / 60;

    // Apply productivity factor (divide by factor to get actual time needed)
    const productivityAdjustedMonthly = totalMonthlyHours / settings.productivity_factor;
    const productivityAdjustedAnnual = totalAnnualHours / settings.productivity_factor;

    // Calculate staff required
    const staffRequiredMonthly = hoursAvailablePerMonth > 0
      ? productivityAdjustedMonthly / hoursAvailablePerMonth
      : 0;
    const staffRequiredAnnual = hoursAvailablePerYear > 0
      ? productivityAdjustedAnnual / hoursAvailablePerYear
      : 0;

    return {
      totalMonthlyMinutes,
      totalAnnualMinutes,
      totalMonthlyHours,
      totalAnnualHours,
      productivityAdjustedMonthly,
      productivityAdjustedAnnual,
      staffRequiredMonthly,
      staffRequiredAnnual,
    };
  }, [activityCalculations, settings.productivity_factor, hoursAvailablePerMonth, hoursAvailablePerYear]);

  const formatNumber = (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">Resource Model</h1>

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
          </div>
        </div>
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
                <Link
                  href="/workflows"
                  className="mt-4 inline-block btn-primary px-4 py-2 rounded-md text-sm"
                >
                  Create First Workflow
                </Link>
              </>
            ) : (
              <p>Select a workflow to view the resource model.</p>
            )}
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading activities...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Workflow Name */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                {selectedWorkflow?.workflow_name || 'Workflow'}
              </h2>
              <p className="text-sm text-gray-500">Resource Model</p>
            </div>

            {/* Capacity Calculation */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-md font-semibold text-gray-800 mb-4">Capacity Calculation</h3>
              <table className="w-full max-w-md">
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Base Capacity (1 FTE)</td>
                    <td className="py-2 text-right font-medium">2,080 hrs/yr</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Working Hours (after PTO)</td>
                    <td className="py-2 text-right font-medium">{formatNumber(settings.hours_per_year)} hrs/yr</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600 pl-4">− Training</td>
                    <td className="py-2 text-right text-gray-500">−{formatNumber(settings.training_hours_per_year)} hrs/yr</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600 pl-4">− Projects</td>
                    <td className="py-2 text-right text-gray-500">−{formatNumber(settings.projects_hours_per_month * 12)} hrs/yr</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600 pl-4">− Meetings</td>
                    <td className="py-2 text-right text-gray-500">−{formatNumber(settings.meetings_hours_per_month * 12)} hrs/yr</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-2 font-semibold text-gray-800">Hours Available for Activities</td>
                    <td className="py-2 text-right font-bold text-gray-900">
                      {formatNumber(hoursAvailablePerYear)} hrs/yr ({formatNumber(hoursAvailablePerMonth, 1)} hrs/mo)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Activities Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-md font-semibold text-gray-800">Activities ({activities.length})</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Task Time (min)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">#/mo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Annual (min)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monthly (min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activityCalculations.map((calc, index) => (
                    <tr key={calc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{calc.activity_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">
                        {calc.taskTime ? formatNumber(calc.taskTime, 1) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">
                        {calc.volume ? formatNumber(calc.volume) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">
                        {calc.annualMinutes ? formatNumber(calc.annualMinutes) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">
                        {calc.monthlyMinutes ? formatNumber(calc.monthlyMinutes) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-900">
                      Total Required (minutes)
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatNumber(totals.totalAnnualMinutes)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatNumber(totals.totalMonthlyMinutes)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-900">
                      Total Required (hours)
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatNumber(totals.totalAnnualHours, 1)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatNumber(totals.totalMonthlyHours, 1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Staff Required */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-md font-semibold text-gray-800 mb-4">Staff Required</h3>
              <table className="w-full max-w-md">
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Required for Activities (hours)</td>
                    <td className="py-2 text-right font-medium">{formatNumber(totals.totalAnnualHours, 1)} hrs/yr</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">
                      Productivity Uplift ({(settings.productivity_factor * 100).toFixed(0)}%)
                    </td>
                    <td className="py-2 text-right font-medium">{formatNumber(totals.productivityAdjustedAnnual, 1)} hrs/yr</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">Hours Available per FTE</td>
                    <td className="py-2 text-right font-medium">{formatNumber(hoursAvailablePerYear)} hrs/yr</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="py-3 font-semibold text-gray-800">Staff Required (FTE)</td>
                    <td className="py-3 text-right font-bold text-blue-700 text-lg">
                      {formatNumber(totals.staffRequiredAnnual, 2)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-4 text-xs text-gray-500">
                * Productivity factor of {(settings.productivity_factor * 100).toFixed(0)}% accounts for breaks, context switching, and other lost time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
