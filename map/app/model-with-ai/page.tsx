'use client';

import ChatInterface from '@/components/chat/ChatInterface';

export default function ModelWithAIPage() {
  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#333333' }}>
          Model with AI
        </h1>
        <p className="text-sm mt-1" style={{ color: '#999999' }}>
          Use AI to create, modify, and analyze your process workflows
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
}
