import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Settings } from '../types';

const STORAGE_KEY = 'nova-ai/settings';

// The hosted server on Vercel; override with EXPO_PUBLIC_API_URL (e.g. a local
// server while developing) or change it in Settings.
const HOSTED_SERVER = 'https://nova-ai-server.vercel.app';
// Older builds defaulted to these, which only work on an emulator or the same computer.
const OLD_DEFAULTS = ['http://10.0.2.2:8787', 'http://localhost:8787'];

export const defaultSettings: Settings = {
  serverUrl: process.env.EXPO_PUBLIC_API_URL ?? HOSTED_SERVER,
  apiToken: '',
  systemPrompt: '',
  voiceLanguage: 'hi-IN',
  displayName: '',
  appearance: 'system',
  accent: 'purple',
};

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = { ...defaultSettings, ...JSON.parse(raw) };
        if (OLD_DEFAULTS.includes(saved.serverUrl)) saved.serverUrl = defaultSettings.serverUrl;
        setSettings(saved);
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
