'use client';

import { Handle, Position } from '@xyflow/react';
import { Activity, calculateActivityCosts } from '@/lib/types';
import type { DisplayMode } from '@/app/page';

interface ActivityNodeProps {
  data: {
    activity: Activity;
    onClick: (activity: Activity) => void;
    displayMode?: DisplayMode;
  };
}

export default function ActivityNode({ data }: ActivityNodeProps) {
  const { activity, onClick, displayMode = 'grid' } = data;

  // Get effective values
  const getEffectiveTaskTime = (): number | null => {
    if (activity.task_time_custom != null) return activity.task_time_custom;
    return activity.task_time_midpoint || null;
  };

  const getEffectiveLaborRate = (): number | null => {
    if (activity.labor_rate_custom != null) return activity.labor_rate_custom;
    return activity.labor_rate_midpoint || null;
  };

  // Format display value based on mode
  const getDisplayValue = (): { text: string; colorClass: string } => {
    switch (displayMode) {
      case 'cost': {
        const costs = calculateActivityCosts(activity);
        if (!costs) return { text: '-', colorClass: 'text-gray-400' };
        const annual = costs.annual_cost;
        const text = annual >= 1000 ? `$${Math.round(annual / 1000)}k` : `$${Math.round(annual)}`;
        // Color coding: green < $10k, yellow $10k-$50k, red > $50k
        let colorClass = 'text-green-600 bg-green-50';
        if (annual >= 50000) colorClass = 'text-red-600 bg-red-50';
        else if (annual >= 10000) colorClass = 'text-yellow-600 bg-yellow-50';
        return { text, colorClass };
      }
      case 'time': {
        const time = getEffectiveTaskTime();
        if (!time) return { text: '-', colorClass: 'text-gray-400' };
        const text = `${time.toFixed(1)} min`;
        // Color coding: green < 5 min, yellow 5-15 min, red > 15 min
        let colorClass = 'text-green-600 bg-green-50';
        if (time > 15) colorClass = 'text-red-600 bg-red-50';
        else if (time >= 5) colorClass = 'text-yellow-600 bg-yellow-50';
        return { text, colorClass };
      }
      case 'rate': {
        const rate = getEffectiveLaborRate();
        if (!rate) return { text: '-', colorClass: 'text-gray-400' };
        const text = `$${Math.round(rate)}/hr`;
        // Color coding: green < $30, yellow $30-$60, red > $60
        let colorClass = 'text-green-600 bg-green-50';
        if (rate > 60) colorClass = 'text-red-600 bg-red-50';
        else if (rate >= 30) colorClass = 'text-yellow-600 bg-yellow-50';
        return { text, colorClass };
      }
      case 'phase': {
        const phase = activity.phase;
        if (!phase) return { text: '-', colorClass: 'text-gray-400' };
        // Color coding by phase number (1-6, rotating for higher phases)
        const phaseColors = [
          'text-blue-600 bg-blue-50',    // 1
          'text-cyan-600 bg-cyan-50',    // 2
          'text-green-600 bg-green-50',  // 3
          'text-yellow-600 bg-yellow-50', // 4
          'text-orange-600 bg-orange-50', // 5
          'text-pink-600 bg-pink-50',    // 6
        ];
        const colorIndex = ((phase - 1) % 6);
        return { text: `Phase ${phase}`, colorClass: phaseColors[colorIndex] };
      }
      default: // 'grid'
        return { text: activity.grid_location || '-', colorClass: 'text-gray-500' };
    }
  };

  const displayValue = getDisplayValue();

  const getStatusColor = () => {
    switch (activity.status) {
      case 'transformed':
        return 'bg-green-100 border-green-500';
      case 'in_progress':
        return 'bg-yellow-100 border-yellow-500';
      case 'analyzing':
        return 'bg-blue-100 border-blue-500';
      case 'deferred':
        return 'bg-gray-100 border-gray-400';
      default:
        return 'bg-white border-gray-300';
    }
  };

  const getPlanBadge = () => {
    if (!activity.transformation_plan) return null;
    const colors: Record<string, string> = {
      eliminate: 'bg-red-500',
      automate: 'bg-purple-500',
      optimize: 'bg-blue-500',
      outsource: 'bg-orange-500',
    };
    return (
      <span
        className={`absolute -top-2 -right-2 text-[10px] text-white px-1.5 py-0.5 rounded ${
          colors[activity.transformation_plan] || 'bg-gray-500'
        }`}
      >
        {activity.transformation_plan.charAt(0).toUpperCase()}
      </span>
    );
  };

  return (
    <div
      className={`relative px-4 py-2 rounded-lg border-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow min-w-[120px] ${getStatusColor()}`}
      onClick={() => onClick(activity)}
    >
      {/* Target handles - can receive connections from multiple directions */}
      <Handle type="target" position={Position.Left} id="left" className="w-2 h-2" />
      <Handle type="target" position={Position.Top} id="top-target" className="w-2 h-2" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-2 h-2" />

      {getPlanBadge()}

      <div className="text-sm font-medium text-gray-800 text-center">
        {activity.activity_name || 'Unnamed'}
      </div>

      <div className={`text-[10px] text-center mt-1 px-1 rounded ${displayValue.colorClass}`}>
        {displayValue.text}
      </div>

      {/* Source handles - can send connections to multiple directions */}
      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2" />
      <Handle type="source" position={Position.Top} id="top" className="w-2 h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2" />
    </div>
  );
}
