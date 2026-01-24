// AI Tool Registry and Executors

import { ToolDefinition } from './types';
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  getSwimlaneConfig,
  saveSwimlaneConfig,
  getTshirtConfig,
} from '../snowflake';

// Tool definitions for AI providers
export const toolDefinitions: ToolDefinition[] = [
  // Workflow Tools
  {
    name: 'list_workflows',
    description: 'List all workflows in the system',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_workflow',
    description: 'Create a new workflow',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the workflow',
        },
        description: {
          type: 'string',
          description: 'Optional description of the workflow',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_workflow',
    description: 'Update an existing workflow',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The ID of the workflow to update',
        },
        name: {
          type: 'string',
          description: 'The new name for the workflow',
        },
        description: {
          type: 'string',
          description: 'The new description for the workflow',
        },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'delete_workflow',
    description: 'Delete a workflow by ID',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The ID of the workflow to delete',
        },
      },
      required: ['id'],
    },
  },

  // Activity Tools
  {
    name: 'list_activities',
    description: 'List all activities in a workflow',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'number',
          description: 'The ID of the workflow to list activities from',
        },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'create_activity',
    description: 'Create a new activity in a workflow',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'number',
          description: 'The ID of the workflow to add the activity to',
        },
        activity_name: {
          type: 'string',
          description: 'The name of the activity',
        },
        grid_location: {
          type: 'string',
          description: 'Grid location in format like "A1", "B2", etc. Letter is swimlane, number is column',
        },
        activity_type: {
          type: 'string',
          description: 'Type of activity',
          enum: ['task', 'decision'],
        },
        connections: {
          type: 'string',
          description: 'Comma-separated list of grid locations this activity connects to',
        },
        status: {
          type: 'string',
          description: 'Status of the activity',
        },
        task_time_size: {
          type: 'string',
          description: 'T-shirt size for task time (XS, S, M, L, XL, Other)',
        },
        labor_rate_size: {
          type: 'string',
          description: 'T-shirt size for labor rate',
        },
        volume_size: {
          type: 'string',
          description: 'T-shirt size for volume',
        },
        transformation_plan: {
          type: 'string',
          description: 'Description of transformation plan for this activity',
        },
        phase: {
          type: 'number',
          description: 'Implementation phase number',
        },
        opportunities: {
          type: 'string',
          description: 'Identified opportunities for improvement',
        },
        process_steps: {
          type: 'string',
          description: 'Detailed process steps',
        },
        systems_touched: {
          type: 'string',
          description: 'Systems involved in this activity',
        },
        constraints_rules: {
          type: 'string',
          description: 'Constraints or business rules',
        },
      },
      required: ['workflowId', 'activity_name', 'grid_location'],
    },
  },
  {
    name: 'update_activity',
    description: 'Update an existing activity',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The ID of the activity to update',
        },
        activity_name: {
          type: 'string',
          description: 'The name of the activity',
        },
        grid_location: {
          type: 'string',
          description: 'Grid location in format like "A1", "B2", etc.',
        },
        activity_type: {
          type: 'string',
          description: 'Type of activity',
          enum: ['task', 'decision'],
        },
        connections: {
          type: 'string',
          description: 'Comma-separated list of grid locations this activity connects to',
        },
        status: {
          type: 'string',
          description: 'Status of the activity',
        },
        task_time_size: {
          type: 'string',
          description: 'T-shirt size for task time',
        },
        labor_rate_size: {
          type: 'string',
          description: 'T-shirt size for labor rate',
        },
        volume_size: {
          type: 'string',
          description: 'T-shirt size for volume',
        },
        transformation_plan: {
          type: 'string',
          description: 'Description of transformation plan',
        },
        phase: {
          type: 'number',
          description: 'Implementation phase number',
        },
        opportunities: {
          type: 'string',
          description: 'Identified opportunities',
        },
      },
      required: ['id', 'activity_name', 'grid_location'],
    },
  },
  {
    name: 'delete_activity',
    description: 'Delete an activity by ID',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The ID of the activity to delete',
        },
      },
      required: ['id'],
    },
  },

  // Swimlane Tools
  {
    name: 'list_swimlanes',
    description: 'List all swimlanes in a workflow',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'number',
          description: 'The ID of the workflow to list swimlanes from',
        },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'create_swimlane',
    description: 'Create a new swimlane in a workflow',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'number',
          description: 'The ID of the workflow to add the swimlane to',
        },
        letter: {
          type: 'string',
          description: 'Single letter identifier for the swimlane (A, B, C, etc.)',
        },
        name: {
          type: 'string',
          description: 'Display name for the swimlane (e.g., "Customer Service", "Operations")',
        },
      },
      required: ['workflowId', 'letter', 'name'],
    },
  },
  {
    name: 'update_swimlane',
    description: 'Update an existing swimlane',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'number',
          description: 'The ID of the workflow containing the swimlane',
        },
        letter: {
          type: 'string',
          description: 'The letter identifier of the swimlane to update',
        },
        name: {
          type: 'string',
          description: 'New display name for the swimlane',
        },
      },
      required: ['workflowId', 'letter', 'name'],
    },
  },

  // Query Tools
  {
    name: 'get_tshirt_config',
    description: 'Get the t-shirt sizing configuration options for task time, labor rate, and volume',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// Tool executor functions - calls Snowflake directly (no HTTP requests)
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (name) {
      // Workflow Tools
      case 'list_workflows': {
        const workflows = await getWorkflows();
        return { success: true, data: workflows };
      }

      case 'create_workflow': {
        const id = await createWorkflow(
          args.name as string,
          args.description as string | undefined
        );
        return { success: true, data: { id, message: `Workflow "${args.name}" created with ID ${id}` } };
      }

      case 'update_workflow': {
        await updateWorkflow(
          args.id as number,
          args.name as string,
          args.description as string | undefined
        );
        return { success: true, data: { message: `Workflow ${args.id} updated successfully` } };
      }

      case 'delete_workflow': {
        await deleteWorkflow(args.id as number);
        return { success: true, data: { message: `Workflow ${args.id} deleted successfully` } };
      }

      // Activity Tools
      case 'list_activities': {
        const activities = await getActivities(args.workflowId as number);
        const swimlanes = await getSwimlaneConfig(args.workflowId as number);
        return { success: true, data: { activities, swimlanes } };
      }

      case 'create_activity': {
        const id = await createActivity(args.workflowId as number, {
          activity_name: args.activity_name as string,
          grid_location: args.grid_location as string,
          activity_type: (args.activity_type as 'task' | 'decision') || 'task',
          connections: args.connections as string | undefined,
          status: args.status as string | undefined,
          task_time_size: args.task_time_size as string | undefined,
          labor_rate_size: args.labor_rate_size as string | undefined,
          volume_size: args.volume_size as string | undefined,
          transformation_plan: args.transformation_plan as string | undefined,
          phase: args.phase as number | undefined,
          opportunities: args.opportunities as string | undefined,
          process_steps: args.process_steps as string | undefined,
          systems_touched: args.systems_touched as string | undefined,
          constraints_rules: args.constraints_rules as string | undefined,
        });
        return { success: true, data: { id, message: `Activity "${args.activity_name}" created at ${args.grid_location} with ID ${id}` } };
      }

      case 'update_activity': {
        await updateActivity(args.id as number, {
          activity_name: args.activity_name as string,
          activity_type: args.activity_type as 'task' | 'decision',
          grid_location: args.grid_location as string,
          connections: args.connections as string | undefined,
          status: args.status as string | undefined,
          task_time_size: args.task_time_size as string | undefined,
          labor_rate_size: args.labor_rate_size as string | undefined,
          volume_size: args.volume_size as string | undefined,
          transformation_plan: args.transformation_plan as string | undefined,
          phase: args.phase as number | undefined,
          opportunities: args.opportunities as string | undefined,
        });
        return { success: true, data: { message: `Activity ${args.id} updated successfully` } };
      }

      case 'delete_activity': {
        await deleteActivity(args.id as number);
        return { success: true, data: { message: `Activity ${args.id} deleted successfully` } };
      }

      // Swimlane Tools
      case 'list_swimlanes': {
        const swimlanes = await getSwimlaneConfig(args.workflowId as number);
        return { success: true, data: swimlanes };
      }

      case 'create_swimlane': {
        await saveSwimlaneConfig(
          args.workflowId as number,
          args.letter as string,
          args.name as string
        );
        return { success: true, data: { message: `Swimlane "${args.letter}: ${args.name}" created successfully` } };
      }

      case 'update_swimlane': {
        await saveSwimlaneConfig(
          args.workflowId as number,
          args.letter as string,
          args.name as string
        );
        return { success: true, data: { message: `Swimlane "${args.letter}" updated to "${args.name}"` } };
      }

      // Query Tools
      case 'get_tshirt_config': {
        const config = await getTshirtConfig();
        return { success: true, data: config };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Generate tool descriptions for the system prompt
export function generateToolDescriptions(): string {
  return toolDefinitions
    .map((tool) => {
      const params = Object.entries(tool.parameters.properties)
        .map(([name, prop]) => {
          const required = tool.parameters.required.includes(name) ? ' (required)' : ' (optional)';
          return `    - ${name}${required}: ${prop.description}`;
        })
        .join('\n');

      return `- ${tool.name}: ${tool.description}${params ? '\n  Parameters:\n' + params : ''}`;
    })
    .join('\n\n');
}
