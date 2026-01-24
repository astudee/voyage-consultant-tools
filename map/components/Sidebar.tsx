'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/lib/SettingsContext';
import { useWorkflow } from '@/lib/WorkflowContext';

// Voyage Advisory brand colors
const brandColors = {
  darkCharcoal: '#333333',
  darkBlue: '#336699',
  mediumBlue: '#6699cc',
  teal: '#669999',
  gray: '#999999',
};

const navItems = [
  { href: '/workflows', label: 'Workflows', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/swimlanes', label: 'Swimlanes', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { href: '/activities', label: 'Activities', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { href: '/', label: 'Process Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { href: '/resource-model', label: 'Resource Model', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { href: '/time-study', label: 'Time Study', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/model-with-ai', label: 'Model with AI', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { settings, updateSettings, hoursAvailablePerMonth } = useSettings();
  const { selectedWorkflow } = useWorkflow();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Don't render sidebar on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <aside className="w-56 text-white flex flex-col" style={{ backgroundColor: brandColors.teal }}>
      <div className="p-4 border-b" style={{ borderColor: brandColors.darkBlue + '44' }}>
        <Image
          src="/voyage-logo-white.png"
          alt="Voyage Advisory"
          width={180}
          height={60}
          className="mb-2"
          priority
        />
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Process Transformation Tools</p>
      </div>

      {/* Current Workflow Indicator */}
      {selectedWorkflow && (
        <div className="px-4 py-3 border-b" style={{ backgroundColor: brandColors.darkBlue, borderColor: brandColors.darkBlue }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Current Workflow</p>
          <p className="text-base font-semibold text-white truncate">{selectedWorkflow.workflow_name}</p>
        </div>
      )}

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-base transition-colors"
              style={{
                backgroundColor: isActive ? brandColors.darkBlue : 'transparent',
                color: 'white',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={item.icon}
                />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Settings Section */}
      <div className="border-t" style={{ borderColor: brandColors.darkBlue + '44' }}>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-base transition-colors"
          style={{ color: 'white' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {settingsOpen && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Productivity Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={Math.round(settings.productivity_factor * 100)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    updateSettings({ productivity_factor: Math.min(100, Math.max(0, val)) / 100 });
                  }}
                  min="0"
                  max="100"
                  className="w-16 rounded px-2 py-1 text-sm text-white focus:outline-none"
                  style={{ backgroundColor: brandColors.darkBlue + '44', borderColor: brandColors.darkBlue, border: '1px solid' }}
                />
                <span className="text-sm" style={{ color: 'white' }}>%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Work Hours / Year
              </label>
              <input
                type="number"
                value={settings.hours_per_year}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateSettings({ hours_per_year: Math.max(0, val) });
                }}
                min="0"
                className="w-full rounded px-2 py-1 text-sm text-white focus:outline-none"
                style={{ backgroundColor: brandColors.darkBlue + '44', borderColor: brandColors.darkBlue, border: '1px solid' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Training / Year
              </label>
              <input
                type="number"
                value={settings.training_hours_per_year}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateSettings({ training_hours_per_year: Math.max(0, val) });
                }}
                min="0"
                className="w-full rounded px-2 py-1 text-sm text-white focus:outline-none"
                style={{ backgroundColor: brandColors.darkBlue + '44', borderColor: brandColors.darkBlue, border: '1px solid' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Projects / Month
              </label>
              <input
                type="number"
                value={settings.projects_hours_per_month}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateSettings({ projects_hours_per_month: Math.max(0, val) });
                }}
                min="0"
                className="w-full rounded px-2 py-1 text-sm text-white focus:outline-none"
                style={{ backgroundColor: brandColors.darkBlue + '44', borderColor: brandColors.darkBlue, border: '1px solid' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Meetings / Month
              </label>
              <input
                type="number"
                value={settings.meetings_hours_per_month}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateSettings({ meetings_hours_per_month: Math.max(0, val) });
                }}
                min="0"
                className="w-full rounded px-2 py-1 text-sm text-white focus:outline-none"
                style={{ backgroundColor: brandColors.darkBlue + '44', borderColor: brandColors.darkBlue, border: '1px solid' }}
              />
            </div>

            <div className="pt-2 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}>
              <p className="text-sm font-medium" style={{ color: 'white' }}>
                Available: {hoursAvailablePerMonth.toFixed(0)} hrs/month
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t text-xs" style={{ borderColor: brandColors.darkBlue + '44', color: 'white' }}>
        <p>v1.0.0</p>
      </div>
    </aside>
  );
}
