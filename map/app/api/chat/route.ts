// Chat API Route - Streaming endpoint for AI chat

import { NextRequest } from 'next/server';
import { ChatMessage, AIProvider, StreamChunk } from '@/lib/ai/types';
import { streamGeminiResponse } from '@/lib/ai/gemini-provider';
import { streamClaudeResponse } from '@/lib/ai/claude-provider';
import { streamOpenAIResponse } from '@/lib/ai/openai-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, provider } = body as { messages: ChatMessage[]; provider: AIProvider };

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!provider || !['gemini', 'claude', 'chatgpt'].includes(provider)) {
      return new Response(JSON.stringify({ error: 'Valid provider (gemini, claude, or chatgpt) is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a streaming response using ReadableStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (chunk: StreamChunk) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        };

        const callbacks = {
          onText: (text: string) => {
            sendChunk({ type: 'text', content: text });
          },
          onToolCall: (toolCall: StreamChunk['toolCall']) => {
            sendChunk({ type: 'tool_call', toolCall });
          },
          onToolResult: (toolResult: StreamChunk['toolResult']) => {
            sendChunk({ type: 'tool_result', toolResult });
          },
          onError: (error: string) => {
            sendChunk({ type: 'error', error });
          },
          onDone: () => {
            sendChunk({ type: 'done' });
            controller.close();
          },
        };

        try {
          if (provider === 'gemini') {
            await streamGeminiResponse(messages, callbacks);
          } else if (provider === 'claude') {
            await streamClaudeResponse(messages, callbacks);
          } else {
            await streamOpenAIResponse(messages, callbacks);
          }
        } catch (error) {
          callbacks.onError(error instanceof Error ? error.message : 'Stream error');
          callbacks.onDone();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
