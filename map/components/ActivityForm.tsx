'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, TshirtConfig } from '@/lib/types';

interface ActivityFormProps {
  activity?: Activity;
  workflowId: number;
}

interface TshirtConfigMap {
  [category: string]: TshirtConfig[];
}

export default function ActivityForm({ activity, workflowId }: ActivityFormProps) {
  const router = useRouter();
  const isEditing = !!activity;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tshirtConfig, setTshirtConfig] = useState<TshirtConfigMap>({});

  // Form state
  const [activityType, setActivityType] = useState<'task' | 'decision'>(
    activity?.activity_type || 'task'
  );
  const [formData, setFormData] = useState({
    activity_name: activity?.activity_name || '',
    grid_location: activity?.grid_location || '',
    status: activity?.status || 'not_started',
    task_time_size: activity?.task_time_size || '',
    task_time_custom: activity?.task_time_custom?.toString() || '',
    labor_rate_size: activity?.labor_rate_size || '',
    labor_rate_custom: activity?.labor_rate_custom?.toString() || '',
    volume_size: activity?.volume_size || '',
    volume_custom: activity?.volume_custom?.toString() || '',
    target_cycle_time_hours: activity?.target_cycle_time_hours?.toString() || '',
    actual_cycle_time_hours: activity?.actual_cycle_time_hours?.toString() || '',
    disposition_complete_pct: activity?.disposition_complete_pct?.toString() || '',
    disposition_forwarded_pct: activity?.disposition_forwarded_pct?.toString() || '',
    disposition_pended_pct: activity?.disposition_pended_pct?.toString() || '',
    transformation_plan: activity?.transformation_plan || '',
    phase: activity?.phase?.toString() || '',
    cost_to_change: activity?.cost_to_change?.toString() || '',
    projected_annual_savings: activity?.projected_annual_savings?.toString() || '',
    process_steps: activity?.process_steps || '',
    systems_touched: activity?.systems_touched || '',
    constraints_rules: activity?.constraints_rules || '',
    opportunities: activity?.opportunities || '',
    next_steps: activity?.next_steps || '',
    comments: activity?.comments || '',
    data_confidence: activity?.data_confidence || '',
    data_source: activity?.data_source || '',
  });

  // Decision branches
  const [branches, setBranches] = useState<Array<{ condition: string; next: string }>>(() => {
    if (activity?.connections) {
      try {
        const parsed = JSON.parse(activity.connections);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b) => ({
            condition: b.condition || '',
            next: b.next || '',
          }));
        }
      } catch {
        // ignore parse error
      }
    }
    return [
      { condition: 'Yes', next: '' },
      { condition: 'No', next: '' },
    ];
  });

  // Task connection (single next)
  const [taskNext, setTaskNext] = useState(() => {
    if (activity?.connections) {
      try {
        const parsed = JSON.parse(activity.connections);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].next) {
          return parsed[0].next;
        }
      } catch {
        // ignore
      }
    }
    return '';
  });

  // Fetch t-shirt config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/tshirt-config');
        const data = await res.json();
        if (data.config) {
          setTshirtConfig(data.config);
        }
      } catch (err) {
        console.error('Failed to fetch t-shirt config:', err);
      }
    }
    fetchConfig();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getMidpoint = (category: string, size: string): number | null => {
    const items = tshirtConfig[category];
    if (!items) return null;
    const item = items.find((i) => i.size === size);
    return item?.midpoint || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.activity_name.trim()) {
      setError('Activity name is required');
      return;
    }

    if (!formData.grid_location.trim()) {
      setError('Grid location is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build connections JSON
      let connections: string | null = null;
      if (activityType === 'decision') {
        const validBranches = branches.filter((b) => b.condition || b.next);
        if (validBranches.length > 0) {
          connections = JSON.stringify(validBranches);
        }
      } else if (taskNext.trim()) {
        connections = JSON.stringify([{ next: taskNext.trim() }]);
      }

      // Get midpoints
      const taskTimeMidpoint =
        formData.task_time_size && formData.task_time_size !== 'Other'
          ? getMidpoint('task_time', formData.task_time_size)
          : formData.task_time_custom
            ? parseFloat(formData.task_time_custom)
            : null;

      const laborRateMidpoint =
        formData.labor_rate_size && formData.labor_rate_size !== 'Other'
          ? getMidpoint('labor_rate', formData.labor_rate_size)
          : formData.labor_rate_custom
            ? parseFloat(formData.labor_rate_custom)
            : null;

      const volumeMidpoint =
        formData.volume_size && formData.volume_size !== 'Other'
          ? getMidpoint('volume', formData.volume_size)
          : formData.volume_custom
            ? parseFloat(formData.volume_custom)
            : null;

      const payload = {
        workflowId,
        activity_name: formData.activity_name.trim(),
        activity_type: activityType,
        grid_location: formData.grid_location.trim().toUpperCase(),
        connections,
        status: formData.status || 'not_started',
        task_time_size:
          formData.task_time_size && formData.task_time_size !== 'Other'
            ? formData.task_time_size
            : null,
        task_time_midpoint: taskTimeMidpoint,
        task_time_custom: formData.task_time_custom
          ? parseFloat(formData.task_time_custom)
          : null,
        labor_rate_size:
          formData.labor_rate_size && formData.labor_rate_size !== 'Other'
            ? formData.labor_rate_size
            : null,
        labor_rate_midpoint: laborRateMidpoint,
        labor_rate_custom: formData.labor_rate_custom
          ? parseFloat(formData.labor_rate_custom)
          : null,
        volume_size:
          formData.volume_size && formData.volume_size !== 'Other'
            ? formData.volume_size
            : null,
        volume_midpoint: volumeMidpoint,
        volume_custom: formData.volume_custom ? parseFloat(formData.volume_custom) : null,
        target_cycle_time_hours: formData.target_cycle_time_hours
          ? parseFloat(formData.target_cycle_time_hours)
          : null,
        actual_cycle_time_hours: formData.actual_cycle_time_hours
          ? parseFloat(formData.actual_cycle_time_hours)
          : null,
        disposition_complete_pct: formData.disposition_complete_pct
          ? parseFloat(formData.disposition_complete_pct)
          : null,
        disposition_forwarded_pct: formData.disposition_forwarded_pct
          ? parseFloat(formData.disposition_forwarded_pct)
          : null,
        disposition_pended_pct: formData.disposition_pended_pct
          ? parseFloat(formData.disposition_pended_pct)
          : null,
        transformation_plan: formData.transformation_plan || null,
        phase: formData.phase ? parseInt(formData.phase) : null,
        cost_to_change: formData.cost_to_change ? parseFloat(formData.cost_to_change) : null,
        projected_annual_savings: formData.projected_annual_savings
          ? parseFloat(formData.projected_annual_savings)
          : null,
        process_steps: formData.process_steps || null,
        systems_touched: formData.systems_touched || null,
        constraints_rules: formData.constraints_rules || null,
        opportunities: formData.opportunities || null,
        next_steps: formData.next_steps || null,
        comments: formData.comments || null,
        data_confidence: formData.data_confidence || null,
        data_source: formData.data_source || null,
      };

      const url = isEditing ? `/api/activities/${activity.id}` : '/api/activities';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      router.push('/activities');
    } catch (err) {
      setError('Failed to save activity');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildSizeOptions = (category: string) => {
    const items = tshirtConfig[category] || [];
    return [
      { value: '', label: '' },
      ...items.map((item) => ({
        value: item.size,
        label: `${item.size} - ${item.label}`,
      })),
      { value: 'Other', label: 'Other' },
    ];
  };

  const addBranch = () => {
    const defaults = ['Yes', 'No', 'Maybe', 'Escalate', 'Approve', 'Deny'];
    const defaultCondition = defaults[branches.length] || '';
    setBranches([...branches, { condition: defaultCondition, next: '' }]);
  };

  const removeBranch = () => {
    if (branches.length > 2) {
      setBranches(branches.slice(0, -1));
    }
  };

  const updateBranch = (index: number, field: 'condition' | 'next', value: string) => {
    const updated = [...branches];
    updated[index][field] = value;
    setBranches(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Info</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Name *
            </label>
            <input
              type="text"
              name="activity_name"
              value={formData.activity_name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as 'task' | 'decision')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="task">Task</option>
              <option value="decision">Decision</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grid Location *
            </label>
            <input
              type="text"
              name="grid_location"
              value={formData.grid_location}
              onChange={handleChange}
              placeholder="e.g., A1, B3"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
        </div>
      </section>

      {/* Connections */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Connections</h2>
        {activityType === 'task' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Next Activity (grid location)
            </label>
            <input
              type="text"
              value={taskNext}
              onChange={(e) => setTaskNext(e.target.value)}
              placeholder="e.g., A2"
              className="w-48 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Define each branch with a label and destination grid location
            </p>
            {branches.map((branch, index) => (
              <div key={index} className="flex gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Branch {index + 1} Label
                  </label>
                  <input
                    type="text"
                    value={branch.condition}
                    onChange={(e) => updateBranch(index, 'condition', e.target.value)}
                    placeholder="e.g., Auto, Home"
                    className="w-40 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Destination {index + 1}
                  </label>
                  <input
                    type="text"
                    value={branch.next}
                    onChange={(e) => updateBranch(index, 'next', e.target.value)}
                    placeholder="e.g., C3"
                    className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addBranch}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Branch
              </button>
              {branches.length > 2 && (
                <button
                  type="button"
                  onClick={removeBranch}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  - Remove Branch
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Time & Cost */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Time & Cost</h2>
        <div className="grid grid-cols-3 gap-6">
          {/* Task Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Time</label>
            <select
              name="task_time_size"
              value={formData.task_time_size}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {buildSizeOptions('task_time').map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {formData.task_time_size === 'Other' && (
              <input
                type="number"
                name="task_time_custom"
                value={formData.task_time_custom}
                onChange={handleChange}
                placeholder="Custom value (minutes)"
                step="0.1"
                min="0"
                className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {formData.task_time_size &&
              formData.task_time_size !== 'Other' &&
              getMidpoint('task_time', formData.task_time_size) && (
                <p className="mt-1 text-xs text-gray-500">
                  Midpoint: {getMidpoint('task_time', formData.task_time_size)} min
                </p>
              )}
          </div>

          {/* Labor Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Labor Rate</label>
            <select
              name="labor_rate_size"
              value={formData.labor_rate_size}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {buildSizeOptions('labor_rate').map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {formData.labor_rate_size === 'Other' && (
              <input
                type="number"
                name="labor_rate_custom"
                value={formData.labor_rate_custom}
                onChange={handleChange}
                placeholder="Custom value ($/hour)"
                step="0.01"
                min="0"
                className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {formData.labor_rate_size &&
              formData.labor_rate_size !== 'Other' &&
              getMidpoint('labor_rate', formData.labor_rate_size) && (
                <p className="mt-1 text-xs text-gray-500">
                  Midpoint: ${getMidpoint('labor_rate', formData.labor_rate_size)}/hr
                </p>
              )}
          </div>

          {/* Volume */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
            <select
              name="volume_size"
              value={formData.volume_size}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {buildSizeOptions('volume').map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {formData.volume_size === 'Other' && (
              <input
                type="number"
                name="volume_custom"
                value={formData.volume_custom}
                onChange={handleChange}
                placeholder="Custom value (per month)"
                step="1"
                min="0"
                className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {formData.volume_size &&
              formData.volume_size !== 'Other' &&
              getMidpoint('volume', formData.volume_size) && (
                <p className="mt-1 text-xs text-gray-500">
                  Midpoint: {getMidpoint('volume', formData.volume_size)?.toLocaleString()}/mo
                </p>
              )}
          </div>
        </div>
      </section>

      {/* SLA / Cycle Time */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">SLA / Cycle Time</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Cycle Time (hours)
            </label>
            <input
              type="number"
              name="target_cycle_time_hours"
              value={formData.target_cycle_time_hours}
              onChange={handleChange}
              step="0.1"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Cycle Time (hours)
            </label>
            <input
              type="number"
              name="actual_cycle_time_hours"
              value={formData.actual_cycle_time_hours}
              onChange={handleChange}
              step="0.1"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Disposition Breakdown */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Disposition Breakdown</h2>
        <p className="text-xs text-gray-500 mb-3">Percentages should sum to 100%</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Complete %</label>
            <input
              type="number"
              name="disposition_complete_pct"
              value={formData.disposition_complete_pct}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="100"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forwarded %</label>
            <input
              type="number"
              name="disposition_forwarded_pct"
              value={formData.disposition_forwarded_pct}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="100"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pended %</label>
            <input
              type="number"
              name="disposition_pended_pct"
              value={formData.disposition_pended_pct}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="100"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Transformation */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Transformation</h2>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select
              name="transformation_plan"
              value={formData.transformation_plan}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value=""></option>
              <option value="eliminate">Eliminate</option>
              <option value="automate">Automate</option>
              <option value="optimize">Optimize</option>
              <option value="outsource">Outsource</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
            <input
              type="number"
              name="phase"
              value={formData.phase}
              onChange={handleChange}
              min="0"
              max="10"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="not_started">Not Started</option>
              <option value="analyzing">Analyzing</option>
              <option value="in_progress">In Progress</option>
              <option value="transformed">Transformed</option>
              <option value="deferred">Deferred</option>
            </select>
          </div>
          <div></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost to Change ($)
            </label>
            <input
              type="number"
              name="cost_to_change"
              value={formData.cost_to_change}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Projected Annual Savings ($)
            </label>
            <input
              type="number"
              name="projected_annual_savings"
              value={formData.projected_annual_savings}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Detail */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Detail</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Process Steps</label>
            <textarea
              name="process_steps"
              value={formData.process_steps}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Systems Touched
            </label>
            <input
              type="text"
              name="systems_touched"
              value={formData.systems_touched}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Constraints / Rules
            </label>
            <textarea
              name="constraints_rules"
              value={formData.constraints_rules}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opportunities</label>
            <textarea
              name="opportunities"
              value={formData.opportunities}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Steps</label>
            <textarea
              name="next_steps"
              value={formData.next_steps}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Notes</h2>
        <textarea
          name="comments"
          value={formData.comments}
          onChange={handleChange}
          rows={4}
          placeholder="Add comments or notes..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </section>

      {/* Data Quality */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Data Quality</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
            <select
              name="data_confidence"
              value={formData.data_confidence}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value=""></option>
              <option value="estimate">Estimate</option>
              <option value="partial">Partial</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
            <input
              type="text"
              name="data_source"
              value={formData.data_source}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <button
          type="button"
          onClick={() => router.push('/activities')}
          className="text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Activity' : 'Create Activity'}
        </button>
      </div>
    </form>
  );
}
