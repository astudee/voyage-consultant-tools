'use client';

import { ChatMessage as ChatMessageType, ToolCall, ToolResult } from '@/lib/ai/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

// Voyage Advisory brand colors
const brandColors = {
  darkCharcoal: '#333333',
  darkBlue: '#336699',
  mediumBlue: '#6699cc',
  teal: '#669999',
  gray: '#999999',
};

function formatToolResult(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }
  const jsonStr = JSON.stringify(result, null, 2);
  return jsonStr.length > 200 ? jsonStr.slice(0, 200) + '...' : jsonStr;
}

function ToolCallDisplay({ toolCall, result }: { toolCall: ToolCall; result?: ToolResult }) {
  const isError = result?.error;
  const isPending = !result;
  const hasResult = result && !isError && result.result !== undefined && result.result !== null;

  return (
    <div
      className="mt-2 p-3 rounded-lg text-sm"
      style={{
        backgroundColor: isError ? '#fef2f2' : isPending ? '#f5f5f5' : '#f0fdf4',
        borderLeft: `3px solid ${isError ? '#ef4444' : isPending ? brandColors.gray : '#22c55e'}`,
      }}
    >
      <div className="flex items-center gap-2 font-medium" style={{ color: brandColors.darkCharcoal }}>
        {isPending ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isError ? (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        <span>{toolCall.name}</span>
      </div>

      {Object.keys(toolCall.arguments).length > 0 && (
        <div className="mt-1 text-xs" style={{ color: brandColors.gray }}>
          Args: {JSON.stringify(toolCall.arguments)}
        </div>
      )}

      {hasResult && (
        <div className="mt-1 text-xs" style={{ color: '#16a34a' }}>
          {formatToolResult(result.result)}
        </div>
      )}

      {isError && (
        <div className="mt-1 text-xs text-red-600">
          Error: {result.error}
        </div>
      )}
    </div>
  );
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Match tool results to their calls
  const toolResultMap = new Map<string, ToolResult>();
  if (message.toolResults) {
    for (const result of message.toolResults) {
      toolResultMap.set(result.toolCallId, result);
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        style={{
          backgroundColor: isUser ? brandColors.darkBlue : '#f3f4f6',
          color: isUser ? 'white' : brandColors.darkCharcoal,
        }}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.toolCalls.map((toolCall) => (
              <ToolCallDisplay
                key={toolCall.id}
                toolCall={toolCall}
                result={toolResultMap.get(toolCall.id)}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div
          className="mt-2 text-xs opacity-70"
          style={{ color: isUser ? 'rgba(255,255,255,0.7)' : brandColors.gray }}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
