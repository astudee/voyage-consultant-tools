'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Settings {
  productivity_factor: number;
  hours_per_year: number;
  training_hours_per_year: number;
}

const DEFAULT_SETTINGS: Settings = {
  productivity_factor: 0.85,
  hours_per_year: 1840,
  training_hours_per_year: 40,
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  workHoursPerMonth: number;
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

  // Derived value
  const workHoursPerMonth =
    (settings.hours_per_year - settings.training_hours_per_year) / 12;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, workHoursPerMonth }}>
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
