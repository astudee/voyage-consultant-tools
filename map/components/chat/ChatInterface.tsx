'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType, AIProvider, StreamChunk, ToolCall, ToolResult } from '@/lib/ai/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ModelSelector from './ModelSelector';

// Voyage Advisory brand colors
const brandColors = {
  darkCharcoal: '#333333',
  darkBlue: '#336699',
  teal: '#669999',
  gray: '#999999',
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Create user message
    const userMessage: ChatMessageType = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Add user message to state
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create assistant message placeholder
    const assistantId = `assistant_${Date.now()}`;
    const assistantMessage: ChatMessageType = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      toolResults: [],
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          provider,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: StreamChunk = JSON.parse(line.slice(6));

              switch (chunk.type) {
                case 'text':
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? { ...msg, content: msg.content + (chunk.content || '') }
                        : msg
                    )
                  );
                  break;

                case 'tool_call':
                  if (chunk.toolCall) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantId
                          ? { ...msg, toolCalls: [...(msg.toolCalls || []), chunk.toolCall as ToolCall] }
                          : msg
                      )
                    );
                  }
                  break;

                case 'tool_result':
                  if (chunk.toolResult) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantId
                          ? { ...msg, toolResults: [...(msg.toolResults || []), chunk.toolResult as ToolResult] }
                          : msg
                      )
                    );
                  }
                  break;

                case 'error':
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? { ...msg, content: msg.content + `\n\nError: ${chunk.error}` }
                        : msg
                    )
                  );
                  break;

                case 'done':
                  // Stream complete
                  break;
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: `Sorry, an error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleClearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ backgroundColor: '#f9fafb' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: brandColors.teal }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold" style={{ color: brandColors.darkCharcoal }}>
              AI Assistant
            </h2>
            <p className="text-xs" style={{ color: brandColors.gray }}>
              Process transformation helper
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ModelSelector
            provider={provider}
            onProviderChange={setProvider}
            disabled={isLoading}
          />
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0 || isLoading}
            className="text-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: brandColors.gray,
              color: brandColors.gray,
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#f9fafb' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: brandColors.teal + '20' }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: brandColors.teal }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: brandColors.darkCharcoal }}>
              How can I help you today?
            </h3>
            <p className="text-sm max-w-md" style={{ color: brandColors.gray }}>
              I can help you manage workflows, create activities and swimlanes, and analyze your
              process transformation data. Try asking me to:
            </p>
            <ul className="text-sm mt-3 space-y-1" style={{ color: brandColors.darkBlue }}>
              <li>&quot;List all workflows&quot;</li>
              <li>&quot;Create a new workflow called Order Processing&quot;</li>
              <li>&quot;Add swimlanes for Sales, Operations, and Finance&quot;</li>
              <li>&quot;Show activities in workflow 1&quot;</li>
            </ul>
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}

        {/* Loading indicator */}
        {isLoading && messages.length > 0 && messages[messages.length - 1].content === '' && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3 rounded-bl-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder={isLoading ? 'Waiting for response...' : 'Ask about workflows, activities, or process transformation...'}
      />
    </div>
  );
}
