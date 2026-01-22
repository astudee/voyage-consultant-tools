'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Voyage Advisory brand colors
const brandColors = {
  darkBlue: '#336699',
  teal: '#669999',
};

export default function ChatInput({ onSend, disabled = false, placeholder = 'Type your message...' }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-white">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:bg-gray-100"
        style={{
          minHeight: '48px',
          maxHeight: '150px',
          // @ts-expect-error CSS custom property
          '--tw-ring-color': brandColors.darkBlue,
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !input.trim()}
        className="flex-shrink-0 rounded-lg px-4 py-3 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: disabled || !input.trim() ? '#9ca3af' : brandColors.darkBlue,
        }}
        onMouseEnter={(e) => {
          if (!disabled && input.trim()) {
            e.currentTarget.style.backgroundColor = brandColors.teal;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && input.trim()) {
            e.currentTarget.style.backgroundColor = brandColors.darkBlue;
          }
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </button>
    </div>
  );
}
