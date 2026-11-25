'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'smogshift-theme';
const THEME_EVENT = 'smogshift-theme-change';

function getSnapshot(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // Ignore restricted storage access
  }
  return 'light';
}

function getServerSnapshot(): ThemeMode {
  return 'light';
}

function subscribe(callback: () => void): () => void {
  const handler = (): void => callback();
  window.addEventListener(THEME_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(THEME_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export interface UseThemeResult {
  readonly theme: ThemeMode;
  readonly toggleTheme: () => void;
}

export function useTheme(): UseThemeResult {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback((): void => {
    const next: ThemeMode = getSnapshot() === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { theme, toggleTheme };
}
