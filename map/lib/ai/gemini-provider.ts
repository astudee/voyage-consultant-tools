// Gemini AI Provider Implementation

import { GoogleGenerativeAI, Content, Part, Tool, SchemaType } from '@google/generative-ai';
import { ChatMessage, ToolCall, ToolResult } from './types';
import { toolDefinitions, executeTool } from './tools';
import { generateSystemPrompt } from './system-prompt';

// Map string types to SchemaType enum
function mapToSchemaType(type: string): SchemaType {
  switch (type) {
    case 'string': return SchemaType.STRING;
    case 'number': return SchemaType.NUMBER;
    case 'integer': return SchemaType.INTEGER;
    case 'boolean': return SchemaType.BOOLEAN;
    case 'array': return SchemaType.ARRAY;
    case 'object': return SchemaType.OBJECT;
    default: return SchemaType.STRING;
  }
}

// Convert our tool definitions to Gemini format
function getGeminiTools(): Tool[] {
  const functionDeclarations = toolDefinitions.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, value]) => [
          key,
          {
            type: mapToSchemaType(value.type),
            description: value.description,
            ...(value.enum ? { enum: value.enum } : {}),
          },
        ])
      ),
      required: tool.parameters.required,
    },
  }));

  // Use type assertion to work around strict SDK type checking
  return [{ functionDeclarations }] as Tool[];
}

// Convert our messages to Gemini format
function convertToGeminiMessages(messages: ChatMessage[]): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: msg.content }],
      });
    } else if (msg.role === 'assistant') {
      const parts: Part[] = [];

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      // Add function calls if present
      if (msg.toolCalls) {
        for (const toolCall of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: toolCall.name,
              args: toolCall.arguments,
            },
          });
        }
      }

      if (parts.length > 0) {
        contents.push({
          role: 'model',
          parts,
        });
      }

      // Add function responses if present
      if (msg.toolResults) {
        const responseParts: Part[] = msg.toolResults.map((result) => ({
          functionResponse: {
            name: result.name,
            response: {
              success: !result.error,
              data: result.result,
              error: result.error,
            },
          },
        }));

        contents.push({
          role: 'user',
          parts: responseParts,
        });
      }
    }
  }

  return contents;
}

export interface GeminiStreamCallbacks {
  onText: (text: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onToolResult: (result: ToolResult) => void;
  onError: (error: string) => void;
  onDone: () => void;
}

export async function streamGeminiResponse(
  messages: ChatMessage[],
  callbacks: GeminiStreamCallbacks
): Promise<void> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    callbacks.onError('GOOGLE_AI_API_KEY is not configured');
    callbacks.onDone();
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: generateSystemPrompt(),
  });

  const tools = getGeminiTools();
  const contents = convertToGeminiMessages(messages);

  try {
    let continueLoop = true;
    let currentContents = [...contents];

    while (continueLoop) {
      const result = await model.generateContentStream({
        contents: currentContents,
        tools,
      });

      let fullText = '';
      const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

      for await (const chunk of result.stream) {
        const candidates = chunk.candidates;
        if (!candidates || candidates.length === 0) continue;

        const parts = candidates[0].content?.parts;
        if (!parts) continue;

        for (const part of parts) {
          if ('text' in part && part.text) {
            fullText += part.text;
            callbacks.onText(part.text);
          } else if ('functionCall' in part && part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              args: part.functionCall.args as Record<string, unknown>,
            });
          }
        }
      }

      // If there are function calls, execute them
      if (functionCalls.length > 0) {
        // Add assistant message with function calls
        const assistantParts: Part[] = [];
        if (fullText) {
          assistantParts.push({ text: fullText });
        }

        const toolCalls: ToolCall[] = [];
        const toolResults: ToolResult[] = [];

        for (const fc of functionCalls) {
          const toolCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const toolCall: ToolCall = {
            id: toolCallId,
            name: fc.name,
            arguments: fc.args,
          };
          toolCalls.push(toolCall);
          callbacks.onToolCall(toolCall);

          assistantParts.push({
            functionCall: {
              name: fc.name,
              args: fc.args,
            },
          });

          // Execute the tool
          const result = await executeTool(fc.name, fc.args);
          const toolResult: ToolResult = {
            toolCallId,
            name: fc.name,
            result: result.data,
            error: result.error,
          };
          toolResults.push(toolResult);
          callbacks.onToolResult(toolResult);
        }

        // Add to contents for next iteration
        currentContents.push({
          role: 'model',
          parts: assistantParts,
        });

        // Add function responses
        const responseParts: Part[] = toolResults.map((result) => ({
          functionResponse: {
            name: result.name,
            response: {
              success: !result.error,
              data: result.result,
              error: result.error,
            },
          },
        }));

        currentContents.push({
          role: 'user',
          parts: responseParts,
        });

        // Continue the loop to get the model's response to the function results
      } else {
        // No function calls, we're done
        continueLoop = false;
      }
    }

    callbacks.onDone();
  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : 'Unknown error occurred');
    callbacks.onDone();
  }
}
