'use client';

import Link from 'next/link';
import { Activity } from '@/lib/types';
import { useSettings } from '@/lib/SettingsContext';

interface DetailPanelProps {
  activity: Activity | null;
  onClose: () => void;
}

export default function DetailPanel({ activity, onClose }: DetailPanelProps) {
  const { settings } = useSettings();

  if (!activity) return null;

  // Calculate costs
  const calculateCosts = () => {
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

      return { monthly_cost: monthlyCost, annual_cost: annualCost };
    }

    return null;
  };

  const costs = calculateCosts();

  const formatCurrency = (value: number | null, decimals: number = 2) => {
    if (value === null || value === undefined) return '-';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('en-US');
  };

  // Get t-shirt size abbreviation
  const getSizeAbbrev = (size: string | null) => {
    if (!size || size === 'Other') return null;
    const abbrevs: Record<string, string> = {
      'Small': 'S',
      'Medium': 'M',
      'Large': 'L',
      'XL': 'XL',
    };
    return abbrevs[size] || null;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      not_started: 'Not Started',
      analyzing: 'Analyzing',
      in_progress: 'In Progress',
      transformed: 'Transformed',
      deferred: 'Deferred',
    };
    return labels[status] || status || '-';
  };

  const getPlanLabel = (plan: string | null) => {
    if (!plan) return '-';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  // Parse connections
  let connections: Array<{ condition?: string; next?: string }> = [];
  if (activity.connections) {
    try {
      connections = JSON.parse(activity.connections);
    } catch {
      connections = [];
    }
  }

  // Check if time & cost section has any data
  const hasTimeCostData = activity.task_time_midpoint || activity.labor_rate_midpoint || activity.volume_midpoint || costs;

  // Check if transformation section has any data
  const hasTransformationData = activity.transformation_plan || activity.phase || (activity.status && activity.status !== 'not_started');

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 overflow-y-auto z-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Activity Details</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/activities/${activity.id}`}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <section>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Basic Info
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500">Name</span>
              <p className="text-gray-800 font-medium">{activity.activity_name || '-'}</p>
            </div>
            <div className="flex gap-4">
              <div>
                <span className="text-xs text-gray-500">Type</span>
                <p className="text-gray-800 capitalize">{activity.activity_type}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Grid Location</span>
                <p className="text-gray-800">{activity.grid_location}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">ID</span>
                <p className="text-gray-800">{activity.id}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Connections */}
        {connections.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Connections
            </h3>
            <div className="space-y-1">
              {connections.map((conn, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {conn.condition && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                      {conn.condition}
                    </span>
                  )}
                  <span className="text-gray-400">&rarr;</span>
                  <span className="text-blue-600 font-medium">{conn.next || '-'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Time & Cost */}
        {hasTimeCostData && (
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Time & Cost
            </h3>
            <div className="space-y-3">
              {/* Input metrics row */}
              <div className="grid grid-cols-3 gap-3">
                {activity.task_time_midpoint && (
                  <div>
                    <span className="text-xs text-gray-500">Task Time</span>
                    <p className="text-gray-800">
                      {activity.task_time_midpoint} min
                      {getSizeAbbrev(activity.task_time_size) && (
                        <span className="text-gray-400 ml-1">({getSizeAbbrev(activity.task_time_size)})</span>
                      )}
                    </p>
                  </div>
                )}
                {activity.labor_rate_midpoint && (
                  <div>
                    <span className="text-xs text-gray-500">Labor Rate</span>
                    <p className="text-gray-800">
                      {formatCurrency(activity.labor_rate_midpoint)}/hr
                      {getSizeAbbrev(activity.labor_rate_size) && (
                        <span className="text-gray-400 ml-1">({getSizeAbbrev(activity.labor_rate_size)})</span>
                      )}
                    </p>
                  </div>
                )}
                {activity.volume_midpoint && (
                  <div>
                    <span className="text-xs text-gray-500">Volume</span>
                    <p className="text-gray-800">
                      {formatNumber(activity.volume_midpoint)}/mo
                      {getSizeAbbrev(activity.volume_size) && (
                        <span className="text-gray-400 ml-1">({getSizeAbbrev(activity.volume_size)})</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              {/* Calculated costs row */}
              {costs && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500">Monthly Cost</span>
                    <p className="text-gray-800 font-medium">{formatCurrency(costs.monthly_cost, 0)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Annual Cost</span>
                    <p className="text-gray-800 font-medium">{formatCurrency(costs.annual_cost, 0)}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Process Steps */}
        {activity.process_steps && (
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Process Steps
            </h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{activity.process_steps}</p>
          </section>
        )}

        {/* Transformation */}
        {hasTransformationData && (
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Transformation
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {activity.transformation_plan && (
                <div>
                  <span className="text-xs text-gray-500">Plan</span>
                  <p className="text-gray-800">{getPlanLabel(activity.transformation_plan)}</p>
                </div>
              )}
              {activity.phase && (
                <div>
                  <span className="text-xs text-gray-500">Phase</span>
                  <p className="text-gray-800">{activity.phase}</p>
                </div>
              )}
              {activity.status && activity.status !== 'not_started' && (
                <div>
                  <span className="text-xs text-gray-500">Status</span>
                  <p className="text-gray-800">{getStatusLabel(activity.status)}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Systems */}
        {activity.systems_touched && (
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Systems
            </h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{activity.systems_touched}</p>
          </section>
        )}

        {/* Constraints & Rules */}
        {activity.constraints_rules && (
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Constraints & Rules
            </h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{activity.constraints_rules}</p>
          </section>
        )}

        {/* Opportunities */}
        {activity.opportunities && (
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Opportunities
            </h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{activity.opportunities}</p>
          </section>
        )}

        {/* Comments */}
        {activity.comments && (
          <section>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Comments
            </h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{activity.comments}</p>
          </section>
        )}
      </div>
    </div>
  );
}
