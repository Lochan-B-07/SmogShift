'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export interface UseSpeechBriefResult {
  readonly supported: boolean;
  readonly speaking: boolean;
  readonly speak: (text: string, lang: 'en' | 'hi') => void;
  readonly stop: () => void;
}

const subscribeNoop = (): (() => void) => () => {};

function getSpeechSupportedSnapshot(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

function getSpeechServerSnapshot(): boolean {
  return false;
}

/**
 * Browser-native speech synthesis wrapper for EN/HI briefs with SSR safety,
 * graceful fallback when a Hindi voice is unavailable, and unmount cleanup.
 */
export function useSpeechBrief(): UseSpeechBriefResult {
  const supported = useSyncExternalStore(
    subscribeNoop,
    getSpeechSupportedSnapshot,
    getSpeechServerSnapshot,
  );
  const [speaking, setSpeaking] = useState<boolean>(false);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, lang: 'en' | 'hi') => {
      if (!supported || !text.trim()) return;

      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      const targetLang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.lang = targetLang;

      const voices = window.speechSynthesis.getVoices?.() ?? [];
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase()) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(lang));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { supported, speaking, speak, stop };
}
