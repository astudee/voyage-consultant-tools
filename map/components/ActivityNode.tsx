'use client';

import { Handle, Position } from '@xyflow/react';
import { Activity } from '@/lib/types';

interface ActivityNodeProps {
  data: {
    activity: Activity;
    onClick: (activity: Activity) => void;
  };
}

export default function ActivityNode({ data }: ActivityNodeProps) {
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
      <Handle type="target" position={Position.Left} className="w-2 h-2" />

      {getPlanBadge()}

      <div className="text-sm font-medium text-gray-800 text-center">
        {activity.activity_name || 'Unnamed'}
      </div>

      <div className="text-[10px] text-gray-500 text-center mt-1">
        {activity.grid_location}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
}
