'use client';

import { Activity } from '@/lib/types';

interface DetailPanelProps {
  activity: Activity | null;
  onClose: () => void;
}

export default function DetailPanel({ activity, onClose }: DetailPanelProps) {
  if (!activity) return null;

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('en-US');
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

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 overflow-y-auto z-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Activity Details</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl leading-none"
        >
          &times;
        </button>
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
        <section>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Time & Cost
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-xs text-gray-500">Task Time</span>
              <p className="text-gray-800">
                {activity.task_time_midpoint ? `${activity.task_time_midpoint} min` : '-'}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Labor Rate</span>
              <p className="text-gray-800">{formatCurrency(activity.labor_rate_midpoint)}/hr</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Volume</span>
              <p className="text-gray-800">{formatNumber(activity.volume_midpoint)}/mo</p>
            </div>
          </div>
        </section>

        {/* Transformation */}
        <section>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Transformation
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-xs text-gray-500">Plan</span>
              <p className="text-gray-800">{getPlanLabel(activity.transformation_plan)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Phase</span>
              <p className="text-gray-800">{activity.phase ?? '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Status</span>
              <p className="text-gray-800">{getStatusLabel(activity.status)}</p>
            </div>
          </div>
        </section>

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
