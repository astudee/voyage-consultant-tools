'use client';

import { AIProvider } from '@/lib/ai/types';

interface ModelSelectorProps {
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  disabled?: boolean;
}

// Voyage Advisory brand colors
const brandColors = {
  darkBlue: '#336699',
  mediumBlue: '#6699cc',
  teal: '#669999',
  gray: '#999999',
};

export default function ModelSelector({ provider, onProviderChange, disabled = false }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium" style={{ color: brandColors.gray }}>
        Model:
      </span>
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: brandColors.mediumBlue }}>
        <button
          onClick={() => onProviderChange('gemini')}
          disabled={disabled}
          className="px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: provider === 'gemini' ? brandColors.darkBlue : 'white',
            color: provider === 'gemini' ? 'white' : brandColors.darkBlue,
          }}
        >
          Gemini
        </button>
        <button
          onClick={() => onProviderChange('claude')}
          disabled={disabled}
          className="px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 border-l"
          style={{
            backgroundColor: provider === 'claude' ? brandColors.darkBlue : 'white',
            color: provider === 'claude' ? 'white' : brandColors.darkBlue,
            borderColor: brandColors.mediumBlue,
          }}
        >
          Claude
        </button>
      </div>
      <span className="text-xs" style={{ color: brandColors.gray }}>
        {provider === 'gemini' ? '(faster)' : '(smarter)'}
      </span>
    </div>
  );
}
