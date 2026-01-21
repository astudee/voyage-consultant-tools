// Shared types that can be used on both client and server

export const CONFIG = {
  productivity_factor: 0.85,
  hours_per_year: 1840,
  training_hours_per_year: 40,
  work_months_per_year: 12,
  work_hours_per_month: (1840 - 40) / 12, // 150 hours/month
};

export interface Activity {
  id: number;
  workflow_id: number;
  activity_name: string;
  activity_type: 'task' | 'decision';
  grid_location: string;
  connections: string | null;
  status: string;
  task_time_size: string | null;
  task_time_midpoint: number | null;
  task_time_custom: number | null;
  labor_rate_size: string | null;
  labor_rate_midpoint: number | null;
  labor_rate_custom: number | null;
  volume_size: string | null;
  volume_midpoint: number | null;
  volume_custom: number | null;
  target_cycle_time_hours: number | null;
  actual_cycle_time_hours: number | null;
  disposition_complete_pct: number | null;
  disposition_forwarded_pct: number | null;
  disposition_pended_pct: number | null;
  transformation_plan: string | null;
  phase: number | null;
  cost_to_change: number | null;
  projected_annual_savings: number | null;
  process_steps: string | null;
  systems_touched: string | null;
  constraints_rules: string | null;
  opportunities: string | null;
  next_steps: string | null;
  attachments: string | null;
  comments: string | null;
  data_confidence: string | null;
  data_source: string | null;
  created_at: string | null;
  created_by: string | null;
  modified_at: string | null;
  modified_by: string | null;
}

export interface ActivityInput {
  activity_name: string;
  activity_type: 'task' | 'decision';
  grid_location: string;
  connections?: string | null;
  status?: string;
  task_time_size?: string | null;
  task_time_midpoint?: number | null;
  task_time_custom?: number | null;
  labor_rate_size?: string | null;
  labor_rate_midpoint?: number | null;
  labor_rate_custom?: number | null;
  volume_size?: string | null;
  volume_midpoint?: number | null;
  volume_custom?: number | null;
  target_cycle_time_hours?: number | null;
  actual_cycle_time_hours?: number | null;
  disposition_complete_pct?: number | null;
  disposition_forwarded_pct?: number | null;
  disposition_pended_pct?: number | null;
  transformation_plan?: string | null;
  phase?: number | null;
  cost_to_change?: number | null;
  projected_annual_savings?: number | null;
  process_steps?: string | null;
  systems_touched?: string | null;
  constraints_rules?: string | null;
  opportunities?: string | null;
  next_steps?: string | null;
  attachments?: string | null;
  comments?: string | null;
  data_confidence?: string | null;
  data_source?: string | null;
}

export interface SwimlaneConfig {
  id?: number;
  swimlane_letter: string;
  swimlane_name: string;
  workflow_id: number;
  display_order?: number;
}

export interface Workflow {
  id: number;
  workflow_name: string;
  description: string;
  created_at: string;
}

export interface TshirtConfig {
  category: string;
  size: string;
  label: string;
  min_value: number;
  max_value: number;
  midpoint: number;
  unit: string;
}

export interface ActivityCosts {
  monthly_cost: number;
  annual_cost: number;
  cost_per_task: number;
  tasks_per_hour: number;
}

// Calculate costs for an activity - can be used client-side
export function calculateActivityCosts(activity: Activity): ActivityCosts | null {
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
    const effectiveTaskTime = taskTime / CONFIG.productivity_factor;
    const tasksPerHour = 60 / effectiveTaskTime;
    const costPerTask = laborRate / tasksPerHour;
    const monthlyCost = costPerTask * volume;
    const annualCost = monthlyCost * CONFIG.work_months_per_year;

    return {
      monthly_cost: monthlyCost,
      annual_cost: annualCost,
      cost_per_task: costPerTask,
      tasks_per_hour: tasksPerHour,
    };
  }

  return null;
}
