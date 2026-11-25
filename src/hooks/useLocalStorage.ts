'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';

const STORAGE_EVENT = 'smogshift-local-storage';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const cacheRef = useRef<{ readonly raw: string | null; readonly value: T }>({
    raw: null,
    value: initialValue,
  });

  const subscribe = useCallback(
    (callback: () => void): (() => void) => {
      const handler = (): void => callback();
      window.addEventListener(STORAGE_EVENT, handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener(STORAGE_EVENT, handler);
        window.removeEventListener('storage', handler);
      };
    },
    [],
  );

  const getSnapshot = useCallback((): T => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return initialValue;
      }
      if (raw === cacheRef.current.raw) {
        return cacheRef.current.value;
      }
      const parsed = JSON.parse(raw) as T;
      cacheRef.current = { raw, value: parsed };
      return parsed;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const getServerSnapshot = useCallback((): T => initialValue, [initialValue]);

  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)): void => {
      const current = getSnapshot();
      const next =
        typeof updater === 'function' ? (updater as (prev: T) => T)(current) : updater;
      try {
        const serialized = JSON.stringify(next);
        window.localStorage.setItem(key, serialized);
        cacheRef.current = { raw: serialized, value: next };
        window.dispatchEvent(new Event(STORAGE_EVENT));
      } catch {
        // Ignore storage quota or restricted context errors
      }
    },
    [key, getSnapshot],
  );

  return [stored, setValue];
}
