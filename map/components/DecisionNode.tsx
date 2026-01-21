'use client';

import { Handle, Position } from '@xyflow/react';
import { Activity } from '@/lib/types';

interface DecisionNodeProps {
  data: {
    activity: Activity;
    onClick: (activity: Activity) => void;
  };
}

export default function DecisionNode({ data }: DecisionNodeProps) {
  const { activity, onClick } = data;

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
          <div className="text-[9px] text-gray-500 mt-0.5">
            {activity.grid_location}
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
