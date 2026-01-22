// AI Tool Registry and Executors

import { ToolDefinition } from './types';

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

// Base URL for internal API calls
function getBaseUrl(): string {
  // In server context, we need to construct the URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

// Tool executor functions
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const baseUrl = getBaseUrl();

  try {
    switch (name) {
      // Workflow Tools
      case 'list_workflows': {
        const res = await fetch(`${baseUrl}/api/workflows`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to list workflows');
        return { success: true, data: data.workflows };
      }

      case 'create_workflow': {
        const res = await fetch(`${baseUrl}/api/workflows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: args.name,
            description: args.description,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create workflow');
        return { success: true, data: { id: data.id, message: `Workflow "${args.name}" created with ID ${data.id}` } };
      }

      case 'update_workflow': {
        const res = await fetch(`${baseUrl}/api/workflows/${args.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: args.name,
            description: args.description,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update workflow');
        return { success: true, data: { message: `Workflow ${args.id} updated successfully` } };
      }

      case 'delete_workflow': {
        const res = await fetch(`${baseUrl}/api/workflows/${args.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete workflow');
        return { success: true, data: { message: `Workflow ${args.id} deleted successfully` } };
      }

      // Activity Tools
      case 'list_activities': {
        const res = await fetch(`${baseUrl}/api/activities?workflowId=${args.workflowId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to list activities');
        return { success: true, data: { activities: data.activities, swimlanes: data.swimlanes } };
      }

      case 'create_activity': {
        const res = await fetch(`${baseUrl}/api/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowId: args.workflowId,
            activity_name: args.activity_name,
            grid_location: args.grid_location,
            activity_type: args.activity_type || 'task',
            connections: args.connections,
            status: args.status,
            task_time_size: args.task_time_size,
            labor_rate_size: args.labor_rate_size,
            volume_size: args.volume_size,
            transformation_plan: args.transformation_plan,
            phase: args.phase,
            opportunities: args.opportunities,
            process_steps: args.process_steps,
            systems_touched: args.systems_touched,
            constraints_rules: args.constraints_rules,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create activity');
        return { success: true, data: { id: data.id, message: `Activity "${args.activity_name}" created at ${args.grid_location} with ID ${data.id}` } };
      }

      case 'update_activity': {
        const res = await fetch(`${baseUrl}/api/activities/${args.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_name: args.activity_name,
            grid_location: args.grid_location,
            activity_type: args.activity_type,
            connections: args.connections,
            status: args.status,
            task_time_size: args.task_time_size,
            labor_rate_size: args.labor_rate_size,
            volume_size: args.volume_size,
            transformation_plan: args.transformation_plan,
            phase: args.phase,
            opportunities: args.opportunities,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update activity');
        return { success: true, data: { message: `Activity ${args.id} updated successfully` } };
      }

      case 'delete_activity': {
        const res = await fetch(`${baseUrl}/api/activities/${args.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete activity');
        return { success: true, data: { message: `Activity ${args.id} deleted successfully` } };
      }

      // Swimlane Tools
      case 'list_swimlanes': {
        const res = await fetch(`${baseUrl}/api/swimlanes?workflowId=${args.workflowId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to list swimlanes');
        return { success: true, data: data.swimlanes };
      }

      case 'create_swimlane': {
        const res = await fetch(`${baseUrl}/api/swimlanes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowId: args.workflowId,
            letter: args.letter,
            name: args.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create swimlane');
        return { success: true, data: { message: `Swimlane "${args.letter}: ${args.name}" created successfully` } };
      }

      case 'update_swimlane': {
        const res = await fetch(`${baseUrl}/api/swimlanes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowId: args.workflowId,
            letter: args.letter,
            name: args.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update swimlane');
        return { success: true, data: { message: `Swimlane "${args.letter}" updated to "${args.name}"` } };
      }

      // Query Tools
      case 'get_tshirt_config': {
        const res = await fetch(`${baseUrl}/api/tshirt-config`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get t-shirt config');
        return { success: true, data: data.config };
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
