// OpenAI (ChatGPT) Provider Implementation

import OpenAI from 'openai';
import { ChatMessage, ToolCall, ToolResult } from './types';
import { toolDefinitions, executeTool } from './tools';
import { generateSystemPrompt } from './system-prompt';

// Convert our tool definitions to OpenAI format
function getOpenAITools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return toolDefinitions.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
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
    },
  }));
}

// Convert our messages to OpenAI format
function convertToOpenAIMessages(messages: ChatMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      openAIMessages.push({
        role: 'user',
        content: msg.content,
      });
    } else if (msg.role === 'assistant') {
      const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];

      // Add tool calls if present
      if (msg.toolCalls) {
        for (const toolCall of msg.toolCalls) {
          toolCalls.push({
            id: toolCall.id,
            type: 'function',
            function: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.arguments),
            },
          });
        }
      }

      openAIMessages.push({
        role: 'assistant',
        content: msg.content || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });

      // Add tool results as separate messages
      if (msg.toolResults) {
        for (const result of msg.toolResults) {
          openAIMessages.push({
            role: 'tool',
            tool_call_id: result.toolCallId,
            content: result.error
              ? JSON.stringify({ error: result.error })
              : JSON.stringify(result.result),
          });
        }
      }
    }
  }

  return openAIMessages;
}

export interface OpenAIStreamCallbacks {
  onText: (text: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onToolResult: (result: ToolResult) => void;
  onError: (error: string) => void;
  onDone: () => void;
}

export async function streamOpenAIResponse(
  messages: ChatMessage[],
  callbacks: OpenAIStreamCallbacks
): Promise<void> {
  const apiKey = process.env.CHATGPT_API_KEY;
  if (!apiKey) {
    callbacks.onError('CHATGPT_API_KEY is not configured');
    callbacks.onDone();
    return;
  }

  const client = new OpenAI({ apiKey });
  const tools = getOpenAITools();
  const systemPrompt = generateSystemPrompt();

  try {
    let continueLoop = true;
    let currentMessages = convertToOpenAIMessages(messages);

    while (continueLoop) {
      const stream = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...currentMessages,
        ],
        tools,
        tool_choice: 'auto',
      });

      let fullText = '';
      const toolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Handle text content
        if (delta.content) {
          fullText += delta.content;
          callbacks.onText(delta.content);
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index;
            if (!toolCalls.has(index)) {
              toolCalls.set(index, {
                id: tc.id || '',
                name: tc.function?.name || '',
                arguments: '',
              });
            }
            const existing = toolCalls.get(index)!;
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) existing.arguments += tc.function.arguments;
          }
        }
      }

      // Check if we need to execute tools
      if (toolCalls.size > 0) {
        const assistantToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];
        const executedToolCalls: ToolCall[] = [];
        const toolResults: ToolResult[] = [];

        for (const [, tc] of toolCalls) {
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = tc.arguments ? JSON.parse(tc.arguments) : {};
          } catch {
            // JSON parsing failed, use empty object
          }

          const toolCall: ToolCall = {
            id: tc.id,
            name: tc.name,
            arguments: parsedArgs,
          };
          executedToolCalls.push(toolCall);
          callbacks.onToolCall(toolCall);

          assistantToolCalls.push({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          });

          // Execute the tool
          const result = await executeTool(tc.name, parsedArgs);
          const toolResult: ToolResult = {
            toolCallId: tc.id,
            name: tc.name,
            result: result.data,
            error: result.error,
          };
          toolResults.push(toolResult);
          callbacks.onToolResult(toolResult);
        }

        // Add assistant message with tool calls
        currentMessages.push({
          role: 'assistant',
          content: fullText || null,
          tool_calls: assistantToolCalls,
        });

        // Add tool results
        for (const result of toolResults) {
          currentMessages.push({
            role: 'tool',
            tool_call_id: result.toolCallId,
            content: result.error
              ? JSON.stringify({ error: result.error })
              : JSON.stringify(result.result),
          });
        }

        // Continue the loop to get the model's response to the tool results
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
