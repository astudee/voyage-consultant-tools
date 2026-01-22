// Claude AI Provider Implementation

import Anthropic from '@anthropic-ai/sdk';
import { ChatMessage, ToolCall, ToolResult } from './types';
import { toolDefinitions, executeTool } from './tools';
import { generateSystemPrompt } from './system-prompt';

// Convert our tool definitions to Claude format
function getClaudeTools(): Anthropic.Tool[] {
  return toolDefinitions.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object' as const,
      properties: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, value]) => [
          key,
          {
            type: value.type,
            description: value.description,
            ...(value.enum ? { enum: value.enum } : {}),
          },
        ])
      ),
      required: tool.parameters.required,
    },
  }));
}

// Convert our messages to Claude format
function convertToClaudeMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  const claudeMessages: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      claudeMessages.push({
        role: 'user',
        content: msg.content,
      });
    } else if (msg.role === 'assistant') {
      const content: Anthropic.ContentBlockParam[] = [];

      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }

      // Add tool use blocks if present
      if (msg.toolCalls) {
        for (const toolCall of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.name,
            input: toolCall.arguments,
          });
        }
      }

      if (content.length > 0) {
        claudeMessages.push({
          role: 'assistant',
          content,
        });
      }

      // Add tool results as user message
      if (msg.toolResults && msg.toolResults.length > 0) {
        const toolResultContent: Anthropic.ToolResultBlockParam[] = msg.toolResults.map((result) => ({
          type: 'tool_result' as const,
          tool_use_id: result.toolCallId,
          content: result.error
            ? JSON.stringify({ error: result.error })
            : JSON.stringify(result.result),
          is_error: !!result.error,
        }));

        claudeMessages.push({
          role: 'user',
          content: toolResultContent,
        });
      }
    }
  }

  return claudeMessages;
}

export interface ClaudeStreamCallbacks {
  onText: (text: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onToolResult: (result: ToolResult) => void;
  onError: (error: string) => void;
  onDone: () => void;
}

export async function streamClaudeResponse(
  messages: ChatMessage[],
  callbacks: ClaudeStreamCallbacks
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    callbacks.onError('ANTHROPIC_API_KEY is not configured');
    callbacks.onDone();
    return;
  }

  const client = new Anthropic({ apiKey });
  const tools = getClaudeTools();
  const systemPrompt = generateSystemPrompt();

  try {
    let continueLoop = true;
    let currentMessages = convertToClaudeMessages(messages);

    while (continueLoop) {
      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: currentMessages,
      });

      let fullText = '';
      const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
      let currentToolUse: { id: string; name: string; input: string } | null = null;

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              input: '',
            };
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            fullText += event.delta.text;
            callbacks.onText(event.delta.text);
          } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
            currentToolUse.input += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolUse) {
            try {
              const input = currentToolUse.input ? JSON.parse(currentToolUse.input) : {};
              toolUses.push({
                id: currentToolUse.id,
                name: currentToolUse.name,
                input,
              });
            } catch {
              // JSON parsing failed, use empty object
              toolUses.push({
                id: currentToolUse.id,
                name: currentToolUse.name,
                input: {},
              });
            }
            currentToolUse = null;
          }
        }
      }

      // Check if we need to execute tools
      if (toolUses.length > 0) {
        // Build assistant message content
        const assistantContent: Anthropic.ContentBlockParam[] = [];
        if (fullText) {
          assistantContent.push({ type: 'text', text: fullText });
        }

        const toolCalls: ToolCall[] = [];
        const toolResults: ToolResult[] = [];

        for (const tu of toolUses) {
          const toolCall: ToolCall = {
            id: tu.id,
            name: tu.name,
            arguments: tu.input,
          };
          toolCalls.push(toolCall);
          callbacks.onToolCall(toolCall);

          assistantContent.push({
            type: 'tool_use',
            id: tu.id,
            name: tu.name,
            input: tu.input,
          });

          // Execute the tool
          const result = await executeTool(tu.name, tu.input);
          const toolResult: ToolResult = {
            toolCallId: tu.id,
            name: tu.name,
            result: result.data,
            error: result.error,
          };
          toolResults.push(toolResult);
          callbacks.onToolResult(toolResult);
        }

        // Add assistant message
        currentMessages.push({
          role: 'assistant',
          content: assistantContent,
        });

        // Add tool results
        const toolResultContent: Anthropic.ToolResultBlockParam[] = toolResults.map((result) => ({
          type: 'tool_result' as const,
          tool_use_id: result.toolCallId,
          content: result.error
            ? JSON.stringify({ error: result.error })
            : JSON.stringify(result.result),
          is_error: !!result.error,
        }));

        currentMessages.push({
          role: 'user',
          content: toolResultContent,
        });

        // Continue the loop to get Claude's response to the tool results
      } else {
        // No tool calls, we're done
        continueLoop = false;
      }
    }

    callbacks.onDone();
  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : 'Unknown error occurred');
    callbacks.onDone();
  }
}
