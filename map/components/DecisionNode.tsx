'use client';

import { Handle, Position } from '@xyflow/react';
import { Activity, calculateActivityCosts } from '@/lib/types';
import type { DisplayMode } from '@/app/page';

interface DecisionNodeProps {
  data: {
    activity: Activity;
    onClick: (activity: Activity) => void;
    displayMode?: DisplayMode;
  };
}

export default function DecisionNode({ data }: DecisionNodeProps) {
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
        let colorClass = 'text-green-600';
        if (annual >= 50000) colorClass = 'text-red-600';
        else if (annual >= 10000) colorClass = 'text-yellow-600';
        return { text, colorClass };
      }
      case 'time': {
        const time = getEffectiveTaskTime();
        if (!time) return { text: '-', colorClass: 'text-gray-400' };
        const text = `${time.toFixed(1)} min`;
        let colorClass = 'text-green-600';
        if (time > 15) colorClass = 'text-red-600';
        else if (time >= 5) colorClass = 'text-yellow-600';
        return { text, colorClass };
      }
      case 'rate': {
        const rate = getEffectiveLaborRate();
        if (!rate) return { text: '-', colorClass: 'text-gray-400' };
        const text = `$${Math.round(rate)}/hr`;
        let colorClass = 'text-green-600';
        if (rate > 60) colorClass = 'text-red-600';
        else if (rate >= 30) colorClass = 'text-yellow-600';
        return { text, colorClass };
      }
      case 'phase': {
        const phase = activity.phase;
        if (!phase) return { text: '-', colorClass: 'text-gray-400' };
        // Color coding by phase number (1-6, rotating for higher phases)
        const phaseColors = [
          'text-blue-600',    // 1
          'text-cyan-600',    // 2
          'text-green-600',   // 3
          'text-yellow-600',  // 4
          'text-orange-600',  // 5
          'text-pink-600',    // 6
        ];
        const colorIndex = ((phase - 1) % 6);
        return { text: `P${phase}`, colorClass: phaseColors[colorIndex] };
      }
      default:
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
      defer: 'bg-gray-500',
    };
    return (
      <span
        className={`absolute -top-2 -right-2 text-[10px] text-white px-1.5 py-0.5 rounded ${
          colors[activity.transformation_plan] || 'bg-gray-500'
        }`}
        style={{ transform: 'none' }}
      >
        {activity.transformation_plan.charAt(0).toUpperCase()}
      </span>
    );
  };

  return (
    <div
      className="relative cursor-pointer"
      onClick={() => onClick(activity)}
    >
      {getPlanBadge()}

      {/* Diamond shape container */}
      <div
        className={`w-24 h-24 border-2 shadow-sm hover:shadow-md transition-shadow ${getStatusColor()}`}
        style={{
          transform: 'rotate(45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Content rotated back */}
        <div
          style={{ transform: 'rotate(-45deg)' }}
          className="text-center p-1"
        >
          <div className="text-xs font-medium text-gray-800 leading-tight">
            {activity.activity_name || 'Unnamed'}
          </div>
          <div className={`text-[9px] mt-0.5 ${displayValue.colorClass}`}>
            {displayValue.text}
          </div>
        </div>
      </div>

      {/* Handles positioned at diamond points */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2"
        style={{ left: -4, top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-2 h-2"
        style={{ right: -4, top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-2 h-2"
        style={{ bottom: -4, left: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="w-2 h-2"
        style={{ top: -4, left: '50%' }}
      />
    </div>
  );
}
