'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/lib/SettingsContext';

const navItems = [
  { href: '/', label: 'Process Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { href: '/activities', label: 'Activities', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { href: '/swimlanes', label: 'Swimlanes', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { settings, updateSettings, workHoursPerMonth } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">Voyage Tools</h1>
        <p className="text-xs text-gray-400">Process Mapping</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
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
      <div className="border-t border-gray-700">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
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
              <label className="block text-xs text-gray-400 mb-1">
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
                  className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
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
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Training & Meetings / Year
              </label>
              <input
                type="number"
                value={settings.training_hours_per_year}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateSettings({ training_hours_per_year: Math.max(0, val) });
                }}
                min="0"
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                Effective: {workHoursPerMonth.toFixed(0)} hrs/month
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        <p>v1.0.0</p>
      </div>
    </aside>
  );
}
