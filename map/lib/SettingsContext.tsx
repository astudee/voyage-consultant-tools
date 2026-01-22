'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Settings {
  productivity_factor: number;
  hours_per_year: number;           // Working hours (after holidays/vacation/sick)
  training_hours_per_year: number;
  projects_hours_per_month: number; // Hours spent on projects not in activities
  meetings_hours_per_month: number; // Hours spent in meetings
}

const DEFAULT_SETTINGS: Settings = {
  productivity_factor: 0.85,
  hours_per_year: 1840,             // Base 2080 - holidays - vacation - sick
  training_hours_per_year: 40,
  projects_hours_per_month: 8,
  meetings_hours_per_month: 4,
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  workHoursPerMonth: number;
  hoursAvailablePerYear: number;
  hoursAvailablePerMonth: number;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('voyage-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        // ignore parse errors
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('voyage-settings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Derived values
  // Working hours per month (before deductions for projects/meetings/training)
  const workHoursPerMonth = settings.hours_per_year / 12;

  // Hours available for activities (after all deductions)
  const hoursAvailablePerYear =
    settings.hours_per_year -
    settings.training_hours_per_year -
    (settings.projects_hours_per_month * 12) -
    (settings.meetings_hours_per_month * 12);

  const hoursAvailablePerMonth = hoursAvailablePerYear / 12;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        workHoursPerMonth,
        hoursAvailablePerYear,
        hoursAvailablePerMonth,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
